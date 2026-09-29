jest.mock('fs', () => ({ writeFileSync: jest.fn() }));
jest.mock('../../controller/coder/aider', () => ({ runAider: jest.fn() }));
jest.mock('../../controller/coder/docker', () => ({ runDockerTests: jest.fn() }));

const { runDebugger } = require('../../controller/debugger/index');
const { runAider } = require('../../controller/coder/aider');
const { runDockerTests } = require('../../controller/coder/docker');

const FAKE_TASK = `## Task 1: Implement CacheService
**Goal:** In-memory key-value cache.
**Acceptance criteria:**
- [ ] get(key) returns undefined for missing keys
- [ ] set then get returns the stored value`;

const FAKE_FAILURE = `FAIL tests/cacheService.test.js\n  × get returns undefined for missing keys\n2 failed, 1 passed`;

const OPTS = { workspace: '/fake/ws', failureOutput: FAKE_FAILURE };

describe('runDebugger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runAider.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
  });

  test('returns { passed:true, attempts:1 } when first fix works', async () => {
    runDockerTests.mockResolvedValue({ exitCode: 0, passed: 3, failed: 0, output: '3 passed' });
    const result = await runDebugger(FAKE_TASK, OPTS);
    expect(result.passed).toBe(true);
    expect(result.attempts).toBe(1);
  });

  test('does not accept stale green tests when the coding tool fails', async () => {
    runAider.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'tool failed' });
    runDockerTests.mockResolvedValue({ exitCode: 0, passed: 3, failed: 0, output: '3 passed' });
    await expect(runDebugger(FAKE_TASK, OPTS)).rejects.toThrow('DebuggerEscalated');
    expect(runDockerTests).not.toHaveBeenCalled();
  });

  test('uses groq/compound-mini for first attempt', async () => {
    runDockerTests.mockResolvedValue({ exitCode: 0, passed: 3, failed: 0, output: '3 passed' });
    await runDebugger(FAKE_TASK, OPTS);
    expect(runAider.mock.calls[0][0].model).toBe('groq/compound-mini');
  });

  test('escalates to gemini/gemini-2.5-flash when first attempt fails', async () => {
    runDockerTests
      .mockResolvedValueOnce({ exitCode: 1, passed: 0, failed: 2, output: '2 failed' })
      .mockResolvedValue({ exitCode: 0, passed: 3, failed: 0, output: '3 passed' });
    const result = await runDebugger(FAKE_TASK, OPTS);
    expect(result.attempts).toBe(2);
    expect(runAider.mock.calls[1][0].model).toBe('gemini/gemini-2.5-flash');
  });

  test('includes original failure output in the first Aider message', async () => {
    runDockerTests.mockResolvedValue({ exitCode: 0, passed: 3, failed: 0, output: '3 passed' });
    await runDebugger(FAKE_TASK, OPTS);
    expect(runAider.mock.calls[0][0].message).toContain('FAIL tests/cacheService.test.js');
  });

  test('includes previous-attempt context in subsequent Aider messages', async () => {
    runDockerTests
      .mockResolvedValueOnce({ exitCode: 1, passed: 0, failed: 2, output: '2 failed' })
      .mockResolvedValue({ exitCode: 0, passed: 3, failed: 0, output: '3 passed' });
    await runDebugger(FAKE_TASK, OPTS);
    const secondMsg = runAider.mock.calls[1][0].message;
    expect(secondMsg).toContain('Attempt 1');
  });

  test('throws "DebuggerEscalated" after all 3 attempts fail', async () => {
    runDockerTests.mockResolvedValue({ exitCode: 1, passed: 0, failed: 2, output: '2 failed' });
    await expect(runDebugger(FAKE_TASK, OPTS)).rejects.toThrow('DebuggerEscalated');
    expect(runAider).toHaveBeenCalledTimes(3);
  });

  test('runs exactly max_automated_attempts Docker checks before escalating', async () => {
    runDockerTests.mockResolvedValue({ exitCode: 1, passed: 0, failed: 2, output: '2 failed' });
    try { await runDebugger(FAKE_TASK, OPTS); } catch {}
    expect(runDockerTests).toHaveBeenCalledTimes(3);
  });

  test('stops immediately when a mid-ladder attempt passes', async () => {
    runDockerTests
      .mockResolvedValueOnce({ exitCode: 1, passed: 1, failed: 1, output: '1 failed' })
      .mockResolvedValueOnce({ exitCode: 0, passed: 3, failed: 0, output: '3 passed' });
    const result = await runDebugger(FAKE_TASK, OPTS);
    expect(result.passed).toBe(true);
    expect(result.attempts).toBe(2);
    expect(runDockerTests).toHaveBeenCalledTimes(2);
  });
});
