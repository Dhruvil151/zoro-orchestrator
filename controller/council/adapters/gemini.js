const fetch = require('node-fetch');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(model, userPrompt, systemPrompt, { maxRetries = 2 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      timeout: 60000,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
      })
    });

    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const violation = body?.error?.details?.find(d => d.quotaId)?.quotaId || '';
      // Daily quota is non-recoverable within this run — fail immediately
      if (violation.includes('PerDay')) {
        throw new Error(`Gemini ${model} failed: 429 (daily quota exhausted — try again tomorrow or switch model)`);
      }
      // Per-minute rate limit — retry with the delay the API specifies
      const retryDelaySec = parseFloat(body?.error?.details
        ?.find(d => d['@type']?.includes('RetryInfo'))
        ?.retryDelay?.replace('s', '') || '65');
      if (attempt < maxRetries) {
        process.stderr.write(`[gemini] ${model} rate-limited (RPM) — retrying in ${retryDelaySec}s\n`);
        await sleep(retryDelaySec * 1000);
        continue;
      }
      throw new Error(`Gemini ${model} failed: 429 (rate limited after ${maxRetries + 1} attempts)`);
    }

    if (res.status === 503) {
      if (attempt < maxRetries) {
        const delay = 10 * (attempt + 1);
        process.stderr.write(`[gemini] ${model} unavailable (503) — retrying in ${delay}s\n`);
        await sleep(delay * 1000);
        continue;
      }
      throw new Error(`Gemini ${model} failed: 503 (service unavailable after ${maxRetries + 1} attempts)`);
    }

    if (!res.ok) {
      throw new Error(`Gemini ${model} failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error(`Gemini ${model} returned empty content`);
    return content;
  }
}

module.exports = { callGemini };
