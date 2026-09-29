function parseTasks(markdown) {
  if (!markdown) return [];

  const sections = markdown.split(/(?=^## Task \d+:)/m).filter((s) => s.trim());

  return sections
    .filter((s) => /^## Task \d+:/.test(s.trim()))
    .map((section) => {
      const headerMatch = section.match(/^## Task (\d+):\s*(.+)/);
      return {
        number: parseInt(headerMatch[1]),
        title: headerMatch[2].trim(),
        text: section.trim(),
      };
    });
}

module.exports = { parseTasks };
