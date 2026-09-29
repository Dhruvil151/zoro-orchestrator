const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function createWorkspace(requirements, workRoot) {
  const slug = slugify(requirements) || 'project';
  const projectDir = path.join(path.resolve(workRoot), `${slug}-${randomUUID()}`);
  const zoroDir = path.join(projectDir, '.zoro');
  const tasksDir = path.join(zoroDir, 'tasks');

  fs.mkdirSync(path.resolve(workRoot), { recursive: true });
  fs.mkdirSync(projectDir);
  fs.mkdirSync(zoroDir, { recursive: true });
  fs.mkdirSync(tasksDir, { recursive: true });

  return { projectDir, zoroDir, tasksDir, slug };
}

function writeZoroFile(dir, filename, content) {
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}

function appendLog(zoroDir, message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(path.join(zoroDir, 'run.log'), entry, 'utf8');
}

const SOURCE_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.cs']);
const CONFIG_FILES = ['package.json', 'Dockerfile', 'jest.config.js', 'jest.config.cjs', '.babelrc', 'tsconfig.json'];
const IGNORED_DIRS = new Set(['node_modules', '.git', '.zoro', '.aider.tags.cache.v3', '__pycache__', 'dist', 'build', 'coverage']);

function discoverSourceFiles(projectDir) {
  const results = [];
  // Always include top-level config files so Aider sees existing deps before editing them
  for (const name of CONFIG_FILES) {
    const full = path.join(projectDir, name);
    try { if (fs.statSync(full).isFile()) results.push(full); } catch { /* not present yet */ }
  }
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); }
      else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) { results.push(full); }
    }
  }
  walk(projectDir);
  return results;
}

module.exports = { slugify, createWorkspace, writeZoroFile, appendLog, discoverSourceFiles };
