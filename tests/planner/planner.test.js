jest.mock('../../controller/council/adapters/groq', () => ({
  callGroq: jest.fn()
}));
jest.mock('../../controller/council/adapters/gemini', () => ({
  callGemini: jest.fn()
}));

const { runPlanner } = require('../../controller/planner/index');
const { callGroq } = require('../../controller/council/adapters/groq');
const { callGemini } = require('../../controller/council/adapters/gemini');

const FAKE_ARCHITECTURE = `
# Architecture: CLI Line Counter
## Components
- FileScanner: walks directory recursively
- LineAnalyzer: classifies each line
- Reporter: formats and prints table
`;

const FAKE_BREAKDOWN = `
# Task Breakdown
## Task 1: Setup project structure
**Goal:** Create package.json and src/ directory
**Acceptance criteria:**
- [ ] package.json exists with name and scripts.test
`;

describe('runPlanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callGroq.mockResolvedValue(FAKE_BREAKDOWN);
    callGemini.mockResolvedValue(FAKE_BREAKDOWN);
  });

  test('returns a non-empty task breakdown string', async () => {
    const result = await runPlanner(FAKE_ARCHITECTURE);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
  });

  test('uses groq/compound-mini as primary', async () => {
    await runPlanner(FAKE_ARCHITECTURE);
    expect(callGroq).toHaveBeenCalledTimes(1);
    expect(callGroq.mock.calls[0][0]).toBe('groq/compound-mini');
  });

  test('does not call Gemini when Groq succeeds', async () => {
    await runPlanner(FAKE_ARCHITECTURE);
    expect(callGemini).not.toHaveBeenCalled();
  });

  test('passes architecture document to Groq', async () => {
    await runPlanner(FAKE_ARCHITECTURE);
    const userPrompt = callGroq.mock.calls[0][1];
    expect(userPrompt).toContain('FileScanner');
  });

  test('falls back to gemini-2.5-flash when Groq fails', async () => {
    callGroq.mockRejectedValue(new Error('Groq rate limit'));
    const result = await runPlanner(FAKE_ARCHITECTURE);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toBe('gemini-2.5-flash');
    expect(result).toBeTruthy();
  });

  test('throws when both Groq and Gemini fail', async () => {
    callGroq.mockRejectedValue(new Error('Groq down'));
    callGemini.mockRejectedValue(new Error('Gemini down'));
    await expect(runPlanner(FAKE_ARCHITECTURE)).rejects.toThrow('Planner failed');
  });
});
