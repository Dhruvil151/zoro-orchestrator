'use strict';

const fetch = require('node-fetch');

const TIMEOUT_MS = 10000;
const PING_PROMPT = 'Respond with exactly: OK';

async function withTimeout(promise, ms, label) {
  let timeout;
  const timer = new Promise((_, reject) =>
    timeout = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
  );
  try {
    await Promise.race([promise, timer]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally { clearTimeout(timeout); }
}

async function checkGroq(model) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: 'GROQ_API_KEY not set' };
  return withTimeout(
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: PING_PROMPT }],
        max_tokens: 10,
      }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (!d.choices?.[0]?.message?.content) throw new Error('empty response');
    }),
    TIMEOUT_MS,
    model
  );
}

async function checkGemini(model) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY not set' };
  // Use the model-list endpoint — free, no generation quota consumed.
  // A 200 means the API key is valid and Gemini is reachable.
  // A 429 means rate-limited but reachable — treat as OK (runtime will retry).
  return withTimeout(
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}`, { headers: { 'x-goog-api-key': apiKey }, timeout: TIMEOUT_MS })
      .then(async (r) => {
        if (r.status === 429) return; // rate-limited but API is up — proceed
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }),
    TIMEOUT_MS,
    model
  );
}

async function checkOllama(model) {
  const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  // Use /api/tags (model list) — instant, no model loading required
  return withTimeout(
    fetch(`${base}/api/tags`).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const names = (d.models || []).map((m) => m.name);
      const found = names.some((n) => n === model || n.startsWith(model.split(':')[0]));
      if (!found) throw new Error(`model ${model} not found (available: ${names.slice(0, 5).join(', ')})`);
    }),
    TIMEOUT_MS,
    model
  );
}

const CHECKS = [
  { label: 'Groq   qwen3.6-27b',   fn: () => checkGroq(process.env.COUNCIL_GROQ_MODEL_A || 'qwen/qwen3.6-27b'),    role: 'council' },
  { label: 'Groq   compound-mini', fn: () => checkGroq(process.env.COUNCIL_GROQ_MODEL_B || 'groq/compound-mini'),   role: 'council' },
  { label: 'Gemini 2.5-flash',     fn: () => checkGemini(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),   role: 'council+moderator+coder+debugger' },
];

const MIN_COUNCIL_QUORUM = 2;

async function runPreflight() {
  console.log('\n[preflight] Checking LLM availability...\n');
  const start = Date.now();

  const results = await Promise.all(
    CHECKS.map(async (c) => {
      const t0 = Date.now();
      const result = await c.fn();
      return { ...c, ...result, ms: Date.now() - t0 };
    })
  );

  let councilUp = 0;
  let coderUp = false;
  let moderatorUp = false;
  const issues = [];

  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const timing = r.ok ? `${r.ms}ms` : r.error;
    console.log(`  ${icon} ${r.label.padEnd(22)} [${r.role}]  ${timing}`);

    if (r.ok) {
      if (r.role.includes('council')) councilUp++;
      if (r.role.includes('moderator')) moderatorUp = true;
      if (r.role.includes('coder')) coderUp = true;
    } else {
      issues.push(`${r.label}: ${r.error}`);
    }
  }

  console.log(`\n  Total preflight: ${Date.now() - start}ms\n`);

  const errors = [];
  if (councilUp < MIN_COUNCIL_QUORUM)
    errors.push(`Council quorum not met: ${councilUp}/${MIN_COUNCIL_QUORUM} available`);
  if (!moderatorUp)
    errors.push('Moderator (Gemini) unavailable — cannot synthesize council output');
  if (!coderUp)
    errors.push('Coder (gemini-2.5-flash) unavailable — no Aider model to write code');

  if (errors.length > 0) {
    console.error('[preflight] FATAL — cannot proceed:\n' + errors.map((e) => `  • ${e}`).join('\n'));
    process.exit(1);
  }

  if (issues.length > 0) {
    console.warn('[preflight] warnings (degraded but can proceed):\n' + issues.map((e) => `  • ${e}`).join('\n'));
  }

  console.log('[preflight] All critical services OK — starting pipeline\n');
}

module.exports = { runPreflight };
