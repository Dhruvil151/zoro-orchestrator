jest.mock('../../controller/council/index', () => ({ runCouncil: jest.fn() }));
jest.mock('../../controller/planner/index', () => ({ runPlanner: jest.fn() }));
jest.mock('../../controller/coder/index', () => ({ runCoder: jest.fn() }));
jest.mock('../../controller/debugger/index', () => ({ runDebugger: jest.fn() }));
jest.mock('fs', () => ({ writeFileSync: jest.fn(), mkdirSync: jest.fn() }));

const { runPipeline } = require('../../controller/pipeline/index');
const { runCouncil } = require('../../controller/council/index');
const { runPlanner } = require('../../controller/planner/index');
const { runCoder } = require('../../controller/coder/index');
const { runDebugger } = require('../../controller/debugger/index');
const fs = require('fs');

const FAKE_REQUIREMENTS = 'Build a file-line-counter CLI';
const FAKE_ARCH = '# Architecture\n## Components\n- Scanner\n- Analyzer';
const FAKE_BREAKDOWN = [
  '## Task 1: Setup structure',
  '**Goal:** Create files.',
  '**Acceptance criteria:**',
  '- [ ] package.json exists',
  '',
  '## Task 2: Implement scanner',
  '**Goal:** Walk directory.',
  '**Acceptance criteria:**',
  '- [ ] finds .js files',
].join('\n');

const OPTS = { workspace: '/fake/project' };
const PASS = { passed: true, tests: { passed: 3, failed: 0, output: '3 passed' } };
const FAIL = { passed: false, tests: { passed: 0, failed: 2, output: '2 failed\nFAIL test.js' } };

describe('runPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runCouncil.mockResolvedValue(FAKE_ARCH);
    runPlanner.mockResolvedValue(FAKE_BREAKDOWN);
    runCoder.mockResolvedValue(PASS);
    runDebugger.mockResolvedValue({ passed: true, attempts: 1 });
  });

  test('returns { status:"complete" } when all tasks pass', async () => {
    const result = await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(result.status).toBe('complete');
  });

  test('rejects an empty task plan instead of reporting success', async () => {
    runPlanner.mockResolvedValue('No tasks generated');
    await expect(runPipeline(FAKE_REQUIREMENTS, OPTS)).rejects.toThrow('no executable tasks');
    expect(runCoder).not.toHaveBeenCalled();
  });

  test('result.tasks lists every parsed task', async () => {
    const result = await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0].task).toBe('Setup structure');
    expect(result.tasks[1].task).toBe('Implement scanner');
  });

  test('calls runCouncil with the requirements', async () => {
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(runCouncil).toHaveBeenCalledWith(FAKE_REQUIREMENTS);
  });

  test('calls runPlanner with the council architecture', async () => {
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(runPlanner).toHaveBeenCalledWith(FAKE_ARCH);
  });

  test('calls runCoder once per task', async () => {
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(runCoder).toHaveBeenCalledTimes(2);
  });

  test('passes each task text to runCoder', async () => {
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(runCoder.mock.calls[0][0]).toContain('Setup structure');
    expect(runCoder.mock.calls[1][0]).toContain('Implement scanner');
  });

  test('calls runDebugger when Coder fails', async () => {
    runCoder.mockResolvedValueOnce(FAIL).mockResolvedValue(PASS);
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(runDebugger).toHaveBeenCalledTimes(1);
  });

  test('passes coder failure output to runDebugger', async () => {
    runCoder.mockResolvedValueOnce(FAIL).mockResolvedValue(PASS);
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(runDebugger.mock.calls[0][1].failureOutput).toContain('2 failed');
  });

  test('does not call runDebugger when Coder passes', async () => {
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    expect(runDebugger).not.toHaveBeenCalled();
  });

  test('throws PipelineEscalated when Debugger escalates', async () => {
    runCoder.mockResolvedValue(FAIL);
    runDebugger.mockRejectedValue(new Error('DebuggerEscalated: 3 attempts exhausted'));
    await expect(runPipeline(FAKE_REQUIREMENTS, OPTS)).rejects.toThrow('PipelineEscalated');
  });

  test('stops processing remaining tasks after escalation', async () => {
    runCoder.mockResolvedValue(FAIL);
    runDebugger.mockRejectedValue(new Error('DebuggerEscalated: 3 attempts exhausted'));
    try { await runPipeline(FAKE_REQUIREMENTS, OPTS); } catch {}
    // Should stop after first task escalates — coder called for task1 only
    expect(runCoder).toHaveBeenCalledTimes(1);
  });

  test('writes architecture.md to workspace .ai/ dir', async () => {
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    const writeCalls = fs.writeFileSync.mock.calls;
    expect(writeCalls.some(([p, c]) => p.includes('architecture.md') && c === FAKE_ARCH)).toBe(true);
  });

  test('writes task-breakdown.md to workspace .ai/ dir', async () => {
    await runPipeline(FAKE_REQUIREMENTS, OPTS);
    const writeCalls = fs.writeFileSync.mock.calls;
    expect(writeCalls.some(([p]) => p.includes('task-breakdown.md'))).toBe(true);
  });
});
