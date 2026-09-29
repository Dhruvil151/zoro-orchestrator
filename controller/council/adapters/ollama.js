const fetch = require('node-fetch');

async function callOllama(model, userPrompt, systemPrompt) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      think: false,   // Qwen3 separates thinking into message.thinking leaving content empty; disable it
      options: { temperature: 0.7, num_predict: 1500 }
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama ${model} failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  // Qwen3 thinking mode: content may be in message.thinking if think was enabled elsewhere
  const content = data.message?.content || data.message?.thinking;
  if (!content) throw new Error(`Ollama ${model} returned empty content`);
  return content;
}

module.exports = { callOllama };
