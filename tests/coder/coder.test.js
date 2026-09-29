jest.mock('fs', () => ({ writeFileSync: jest.fn() }));
jest.mock('../../controller/coder/aider', () => ({ runAider: jest.fn() }));
jest.mock('../../controller/coder/docker', () => ({ runDockerTests: jest.fn() }));

const { runCoder } = require('../../controller/coder/index');
const { runAider } = require('../../controller/coder/aider');
const { runDockerTests } = require('../../controller/coder/docker');

const FAKE_TASK = `## Task 1: Implement CacheService
**Goal:** Implement an in-memory key-value cache with get/set.
**Acceptance criteria:**
- [ ] CacheService exports { CacheService }
- [ ] get(key) returns undefined for missing keys
- [ ] set(key, value) then get(key) returns value`;

const FAKE_WORKSPACE = '/fake/workspace';

describe('runCoder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runAider.mockResolvedValue({ exitCode: 0, stdout: 'Files written.', stderr: '' });
    runDockerTests.mockResolvedValue({ exitCode: 0, passed: 7, failed: 0, output: 'Tests: 7 passed' });
  });

  test('returns passed:true when Aider succeeds and all tests pass', async () => {
    const result = await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(result.passed).toBe(true);
    expect(result.tests.passed).toBe(7);
    expect(result.tests.failed).toBe(0);
  });

  test('uses groq/compound-mini as primary model', async () => {
    await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(runAider.mock.calls[0][0].model).toBe('groq/compound-mini');
  });

  test('passes task text in Aider message', async () => {
    await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(runAider.mock.calls[0][0].message).toContain('CacheService');
  });

  test('passes workspace to both Aider and Docker', async () => {
    await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(runAider.mock.calls[0][0].workspace).toBe(FAKE_WORKSPACE);
    expect(runDockerTests.mock.calls[0][0]).toBe(FAKE_WORKSPACE);
  });

  test('runs Docker tests after Aider completes', async () => {
    const callOrder = [];
    runAider.mockImplementation(async () => { callOrder.push('aider'); return { exitCode: 0, stdout: '', stderr: '' }; });
    runDockerTests.mockImplementation(async () => { callOrder.push('docker'); return { exitCode: 0, passed: 1, failed: 0, output: '' }; });

    await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(callOrder).toEqual(['aider', 'docker']);
  });

  test('falls back to gemini/gemini-2.5-flash when primary Aider exits non-zero', async () => {
    runAider
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'aider error' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'ok', stderr: '' });

    await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(runAider).toHaveBeenCalledTimes(2);
    expect(runAider.mock.calls[1][0].model).toBe('gemini/gemini-2.5-flash');
  });

  test('returns passed:false when Docker reports test failures', async () => {
    runDockerTests.mockResolvedValue({ exitCode: 1, passed: 5, failed: 2, output: '5 passed, 2 failed' });
    const result = await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(result.passed).toBe(false);
  });

  test('returns passed:true when exit code 0 even if counts unparseable', async () => {
    // Custom test scripts (non-Jest) may not output "X passed" — exit code is source of truth
    runDockerTests.mockResolvedValue({ exitCode: 0, passed: 0, failed: 0, output: 'All tests passed!' });
    const result = await runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE });
    expect(result.passed).toBe(true);
  });

  test('throws when both primary and fallback Aider fail', async () => {
    runAider.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'error' });
    await expect(runCoder(FAKE_TASK, { workspace: FAKE_WORKSPACE })).rejects.toThrow('Coder failed');
  });
});
