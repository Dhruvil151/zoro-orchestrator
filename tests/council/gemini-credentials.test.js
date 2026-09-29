jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');
const {callGemini} = require('../../controller/council/adapters/gemini');
test('sends the key in a header, never in the request URL', async () => {
  const old = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only-placeholder';
  try {
    fetch.mockResolvedValue({ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:'result'}]}}]})});
    expect(await callGemini('test-model','input','system')).toBe('result');
    const [url, options] = fetch.mock.calls.at(-1);
    expect(url).not.toContain('key=');
    expect(url).not.toContain('test-only-placeholder');
    expect(options.headers['x-goog-api-key']).toBe('test-only-placeholder');
    expect(options.timeout).toBeGreaterThan(0);
  } finally {
    if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old;
  }
});
