const { stripThinkTags } = require('../../controller/council/parser');

describe('stripThinkTags', () => {
  test('removes <think>...</think> block', () => {
    const input = '<think>some internal reasoning</think>\nFinal answer here';
    expect(stripThinkTags(input)).toBe('Final answer here');
  });

  test('passes through text with no think tags', () => {
    const input = 'Just a regular answer';
    expect(stripThinkTags(input)).toBe('Just a regular answer');
  });

  test('handles multiline think blocks', () => {
    const input = '<think>\nLine 1\nLine 2\n</think>\n\nActual content';
    expect(stripThinkTags(input)).toBe('Actual content');
  });

  test('strips leading/trailing whitespace after removal', () => {
    const input = '<think>thoughts</think>   \n\n   Answer';
    expect(stripThinkTags(input)).toBe('Answer');
  });

  test('handles empty input', () => {
    expect(stripThinkTags('')).toBe('');
  });

  test('handles input with only think tags', () => {
    const input = '<think>only thinking, no output</think>';
    expect(stripThinkTags(input)).toBe('');
  });
});
