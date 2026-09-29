const fetch = require('node-fetch');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGroq(model, userPrompt, systemPrompt, { maxRetries = 2, timeoutMs = 30000, maxTokens = 2048 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (res.status === 429) {
        const body = await res.text();
        if (attempt < maxRetries) {
          const delay = 65000 * (attempt + 1); // 65s then 130s — reset OTPM window
          process.stderr.write(`[groq] rate limited (${model}), retrying in ${delay / 1000}s...\n`);
          await sleep(delay);
          continue;
        }
        throw new Error(`Groq ${model} failed: 429 ${body}`);
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq ${model} failed: ${res.status} ${body}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error(`Groq ${model} returned empty content`);
      return content;

    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error(`Groq ${model} timed out after ${timeoutMs}ms`);
      if (attempt < maxRetries && (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT'))) {
        process.stderr.write(`[groq] connection error (${model}), retrying...\n`);
        await sleep(3000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

module.exports = { callGroq };
