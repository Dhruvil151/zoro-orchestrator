jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

const fs = require('fs');
const { slugify, createWorkspace, writeZoroFile, appendLog } = require('../../controller/pipeline/workspace');

beforeEach(() => jest.clearAllMocks());

describe('slugify', () => {
  test('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Build A CLI Tool')).toBe('build-a-cli-tool');
  });

  test('removes special characters', () => {
    expect(slugify('React + Node.js & Redis!')).toBe('react-nodejs-redis');
  });

  test('collapses multiple consecutive dashes', () => {
    expect(slugify('react---node')).toBe('react-node');
  });

  test('trims leading and trailing dashes', () => {
    expect(slugify('  --my app--  ')).toBe('my-app');
  });

  test('truncates to 60 characters', () => {
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(60);
  });

  test('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('createWorkspace', () => {
  test('creates projectDir, .zoro/, and .zoro/tasks/ directories', () => {
    createWorkspace('build a web app', '/fake/work');
    const dirs = fs.mkdirSync.mock.calls.map(([d]) => d);
    expect(dirs.some((d) => d.includes('build-a-web-app'))).toBe(true);
    expect(dirs.some((d) => d.includes('.zoro'))).toBe(true);
    expect(dirs.some((d) => d.includes('tasks'))).toBe(true);
  });

  test('returns projectDir, zoroDir, tasksDir, and slug', () => {
    const result = createWorkspace('build a web app', '/fake/work');
    expect(result.projectDir).toContain('build-a-web-app');
    expect(result.zoroDir).toContain('.zoro');
    expect(result.tasksDir).toContain('tasks');
    expect(result.slug).toBe('build-a-web-app');
  });

  test('projectDir is under workRoot', () => {
    const result = createWorkspace('my app', '/custom/root');
    // path.join uses OS separator — check containment rather than startsWith
    expect(result.projectDir).toContain('custom');
    expect(result.projectDir).toContain('root');
    expect(result.projectDir).toContain('my-app');
  });
});

describe('writeZoroFile', () => {
  test('writes content to the correct path in the given directory', () => {
    writeZoroFile('/fake/.zoro', 'architecture.md', '# Architecture');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('architecture.md'),
      '# Architecture',
      'utf8'
    );
  });
});

describe('appendLog', () => {
  test('appends entry to run.log inside zoroDir', () => {
    appendLog('/fake/.zoro', 'Pipeline started');
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringContaining('run.log'),
      expect.stringContaining('Pipeline started'),
      'utf8'
    );
  });

  test('entry includes a timestamp', () => {
    appendLog('/fake/.zoro', 'Test entry');
    const written = fs.appendFileSync.mock.calls.at(-1)[1];
    expect(written).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });
});
