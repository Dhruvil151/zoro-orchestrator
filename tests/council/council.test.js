jest.mock('../../controller/council/adapters/groq', () => ({
  callGroq: jest.fn()
}));
jest.mock('../../controller/council/adapters/gemini', () => ({
  callGemini: jest.fn()
}));
jest.mock('../../controller/council/adapters/ollama', () => ({
  callOllama: jest.fn()
}));

const { runCouncil } = require('../../controller/council/index');
const { callGroq } = require('../../controller/council/adapters/groq');
const { callGemini } = require('../../controller/council/adapters/gemini');
const { callOllama } = require('../../controller/council/adapters/ollama');

const FAKE_REQUIREMENTS = 'Build a REST API with authentication and CRUD for users';

describe('runCouncil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callGroq.mockResolvedValue('Architecture draft from Groq');
    callGemini.mockResolvedValue('Architecture draft from Gemini');
    callOllama.mockResolvedValue('Architecture draft from Ollama');
  });

  test('returns a non-empty synthesized architecture string', async () => {
    const result = await runCouncil(FAKE_REQUIREMENTS);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
  });

  test('calls all council members (2 Groq + 1 Gemini member)', async () => {
    await runCouncil(FAKE_REQUIREMENTS);
    expect(callGroq).toHaveBeenCalledTimes(2);
    expect(callOllama).not.toHaveBeenCalled();
    // 1 Gemini council member + 1 moderator = 2 total Gemini calls
    expect(callGemini).toHaveBeenCalledTimes(2);
  });

  test('passes requirements text to council members', async () => {
    await runCouncil(FAKE_REQUIREMENTS);
    const groqCallArgs = callGroq.mock.calls[0];
    // callGroq(model, userPrompt, systemPrompt) — userPrompt is index 1
    expect(groqCallArgs[1]).toContain(FAKE_REQUIREMENTS);
  });

  test('passes all member drafts to the moderator', async () => {
    await runCouncil(FAKE_REQUIREMENTS);
    // Last callGemini is the moderator; its userPrompt (index 1) must contain the drafts
    const moderatorPrompt = callGemini.mock.calls[callGemini.mock.calls.length - 1][1];
    expect(moderatorPrompt).toContain('Architecture draft from Groq');
    expect(moderatorPrompt).toContain('Architecture draft from Gemini');
  });

  test('still returns result when 1 of 3 members fails (quorum met)', async () => {
    callGroq.mockRejectedValueOnce(new Error('Groq timeout'));
    callOllama.mockRejectedValue(new Error('Ollama unreachable'));
    // 2 members still succeed (1 Groq + 1 Gemini) → quorum met
    const result = await runCouncil(FAKE_REQUIREMENTS);
    expect(result).toBeTruthy();
  });

  test('throws with "Council quorum" message when fewer than 2 members respond', async () => {
    callGroq.mockRejectedValue(new Error('Groq down'));
    callGemini.mockRejectedValue(new Error('Gemini down'));
    callOllama.mockRejectedValue(new Error('Ollama down'));

    await expect(runCouncil(FAKE_REQUIREMENTS)).rejects.toThrow('Council quorum');
  });

  test('strips <think> tags from member output before passing to moderator', async () => {
    callGroq.mockResolvedValue('<think>hidden reasoning</think>\nClean architecture draft');
    await runCouncil(FAKE_REQUIREMENTS);

    const moderatorPrompt = callGemini.mock.calls[callGemini.mock.calls.length - 1][1];
    expect(moderatorPrompt).not.toContain('<think>');
    expect(moderatorPrompt).toContain('Clean architecture draft');
  });
});
