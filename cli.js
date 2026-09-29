#!/usr/bin/env node
'use strict';

require('dotenv').config();

const path = require('path');
const { createWorkspace, writeZoroFile, appendLog } = require('./controller/pipeline/workspace');
const { runPipeline } = require('./controller/pipeline/index');
const { runPreflight } = require('./controller/preflight');

const WORK_ROOT = path.resolve(process.env.ZORO_WORK_ROOT || path.join(__dirname, 'workspaces'));

async function main() {
  const requirements = process.argv.slice(2).join(' ').trim();
  if (!requirements) {
    console.error('Usage: node cli.js "<requirements>"');
    process.exit(1);
  }

  await runPreflight();

  const { projectDir, zoroDir, tasksDir, slug } = createWorkspace(requirements, WORK_ROOT);

  console.log(`\nZORO — starting pipeline`);
  console.log(`  Project : ${projectDir}`);
  console.log(`  Slug    : ${slug}`);
  console.log(`  Artifacts: ${zoroDir}\n`);

  writeZoroFile(zoroDir, 'requirements.md', `# Requirements\n\n${requirements}\n`);
  appendLog(zoroDir, `Pipeline started for: ${requirements}`);

  let taskCount = 0;

  const hooks = {
    onLog(msg) {
      appendLog(zoroDir, msg);
    },
    onTaskStart(task) {
      taskCount++;
      const filename = `task-${String(task.number).padStart(2, '0')}-${task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}.md`;
      writeZoroFile(tasksDir, filename, `# Task ${task.number}: ${task.title}\n\n${task.text}\n`);
    },
    onTaskDone(task, status) {
      appendLog(zoroDir, `Task ${task.number} "${task.title}" — ${status}`);
    },
  };

  try {
    const result = await runPipeline(requirements, {
      workspace: projectDir,
      hooks,
    });

    appendLog(zoroDir, `Pipeline complete — ${result.tasks.length} tasks`);

    console.log('\n=== ZORO complete ===');
    for (const t of result.tasks) {
      const icon = t.status === 'passed' ? '✓' : '✗';
      console.log(`  ${icon} ${t.task} (${t.status}${t.attempts ? `, ${t.attempts} attempt(s)` : ''})`);
    }
    console.log(`\nProject at: ${projectDir}`);
    console.log(`Log at    : ${path.join(zoroDir, 'run.log')}`);
  } catch (err) {
    appendLog(zoroDir, `Pipeline failed: ${err.message}`);
    console.error(`\nZORO failed: ${err.message}`);
    process.exit(1);
  }
}

main();
