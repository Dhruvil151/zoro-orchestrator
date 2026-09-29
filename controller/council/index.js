const { callGroq } = require('./adapters/groq');
const { callGemini } = require('./adapters/gemini');
const { callOllama } = require('./adapters/ollama');
const { stripThinkTags } = require('./parser');
const { COUNCIL_SYSTEM, MODERATOR_SYSTEM, councilUserPrompt, moderatorUserPrompt } = require('./prompts');

// qwen3:4b (Ollama) removed — 2+ min generation time drags the whole council (slowest link in parallel)
// Swap back in when qwen3:8b is pulled — fast enough on RTX 5060 to not block API members
const COUNCIL_MEMBERS = [
  { name: 'qwen3.6-27b (Groq)',   fn: (p) => callGroq(process.env.COUNCIL_GROQ_MODEL_A || 'qwen/qwen3.6-27b',  p, COUNCIL_SYSTEM) },
  { name: 'compound-mini (Groq)', fn: (p) => callGroq(process.env.COUNCIL_GROQ_MODEL_B || 'groq/compound-mini', p, COUNCIL_SYSTEM) },
  { name: 'gemini-2.5-flash',     fn: (p) => callGemini(process.env.GEMINI_MODEL || 'gemini-2.5-flash', p, COUNCIL_SYSTEM) },
];

const MIN_QUORUM = 2;

async function runCouncil(requirements) {
  const userPrompt = councilUserPrompt(requirements);

  const results = await Promise.allSettled(
    COUNCIL_MEMBERS.map(async (member) => {
      const raw = await member.fn(userPrompt);
      return { name: member.name, content: stripThinkTags(raw) };
    })
  );

  const drafts = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    const msgs = failures.map((r) => r.reason?.message || 'unknown').join('; ');
    process.stderr.write(`[council] ${failures.length} member(s) failed: ${msgs}\n`);
  }

  if (drafts.length < MIN_QUORUM) {
    const errors = failures.map((r) => r.reason?.message || 'unknown').join('; ');
    throw new Error(
      `Council quorum not met: ${drafts.length}/${COUNCIL_MEMBERS.length} responded. Errors: ${errors}`
    );
  }

  const modPrompt = moderatorUserPrompt(requirements, drafts);
  // Gemini direct API (generativelanguage.googleapis.com) = 500 RPD, no Vertex quota issue
  const synthesis = await callGemini(process.env.GEMINI_MODEL || 'gemini-2.5-flash', modPrompt, MODERATOR_SYSTEM);
  return stripThinkTags(synthesis);
}

module.exports = { runCouncil };
