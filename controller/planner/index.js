const { callGroq } = require('../council/adapters/groq');
const { callGemini } = require('../council/adapters/gemini');
const { PLANNER_SYSTEM, plannerUserPrompt } = require('./prompts');

// Groq primary saves Gemini RPD quota; Gemini fallback if Groq is unavailable
const PRIMARY_MODEL = process.env.PLANNER_GROQ_MODEL || 'groq/compound-mini';  // different model from Council member A (qwen3.6-27b)
const FALLBACK_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function runPlanner(architecture) {
  const userPrompt = plannerUserPrompt(architecture);

  try {
    return await callGroq(PRIMARY_MODEL, userPrompt, PLANNER_SYSTEM, { maxTokens: 4096 });
  } catch (primaryErr) {
    process.stderr.write(`[planner] primary (groq/${PRIMARY_MODEL}) failed: ${primaryErr.message} — trying fallback\n`);
    try {
      return await callGemini(FALLBACK_MODEL, userPrompt, PLANNER_SYSTEM);
    } catch (fallbackErr) {
      throw new Error(
        `Planner failed: primary=${primaryErr.message}; fallback=${fallbackErr.message}`
      );
    }
  }
}

module.exports = { runPlanner };
