const { parseTasks } = require('../../controller/pipeline/taskParser');

const SAMPLE_BREAKDOWN = `# Task Breakdown

## Task 1: Setup project structure
**Goal:** Create package.json and src/ directory.
**Acceptance criteria:**
- [ ] package.json exists with name field
- [ ] src/ directory exists

## Task 2: Implement FileScanner
**Goal:** Walk directory recursively and collect .js files.
**Acceptance criteria:**
- [ ] Returns empty array for empty directory
- [ ] Finds nested .js files

## Task 3: Implement LineAnalyzer
**Goal:** Classify each line as code, blank, or comment.
**Acceptance criteria:**
- [ ] Blank lines counted correctly`;

describe('parseTasks', () => {
  test('returns an array of task objects', () => {
    const tasks = parseTasks(SAMPLE_BREAKDOWN);
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('parses the correct number of tasks', () => {
    const tasks = parseTasks(SAMPLE_BREAKDOWN);
    expect(tasks.length).toBe(3);
  });

  test('each task has number, title, and text fields', () => {
    const tasks = parseTasks(SAMPLE_BREAKDOWN);
    for (const t of tasks) {
      expect(typeof t.number).toBe('number');
      expect(typeof t.title).toBe('string');
      expect(typeof t.text).toBe('string');
    }
  });

  test('parses task numbers correctly', () => {
    const tasks = parseTasks(SAMPLE_BREAKDOWN);
    expect(tasks[0].number).toBe(1);
    expect(tasks[1].number).toBe(2);
    expect(tasks[2].number).toBe(3);
  });

  test('parses task titles correctly', () => {
    const tasks = parseTasks(SAMPLE_BREAKDOWN);
    expect(tasks[0].title).toBe('Setup project structure');
    expect(tasks[1].title).toBe('Implement FileScanner');
  });

  test('task text includes the acceptance criteria', () => {
    const tasks = parseTasks(SAMPLE_BREAKDOWN);
    expect(tasks[0].text).toContain('package.json exists');
    expect(tasks[1].text).toContain('Finds nested .js files');
  });

  test('task text does not bleed into the next task', () => {
    const tasks = parseTasks(SAMPLE_BREAKDOWN);
    expect(tasks[0].text).not.toContain('Implement FileScanner');
  });

  test('returns empty array for input with no tasks', () => {
    expect(parseTasks('# Task Breakdown\n\nNo tasks here.')).toEqual([]);
    expect(parseTasks('')).toEqual([]);
  });

  test('handles single task', () => {
    const single = `## Task 1: Only task\n**Goal:** Do it.\n**Acceptance criteria:**\n- [ ] Done`;
    const tasks = parseTasks(single);
    expect(tasks.length).toBe(1);
    expect(tasks[0].number).toBe(1);
  });
});
