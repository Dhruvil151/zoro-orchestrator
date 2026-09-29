function stripThinkTags(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

module.exports = { stripThinkTags };
