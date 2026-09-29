const fs = require('fs');
const path = require('path');
const { runCouncil } = require('../council/index');
const { runPlanner } = require('../planner/index');
const { runCoder } = require('../coder/index');
const { runDebugger } = require('../debugger/index');
const { parseTasks } = require('./taskParser');
const { discoverSourceFiles } = require('./workspace');

async function runPipeline(requirements, { workspace, readFiles = [], srcDirs = [], hooks = {} } = {}) {
  const zoroDir = path.join(workspace, '.zoro');
  fs.mkdirSync(zoroDir, { recursive: true });

  const log = (msg) => {
    process.stdout.write(`${msg}\n`);
    if (hooks.onLog) hooks.onLog(msg);
  };

  // Stage 1: Council — produce architecture
  log('[pipeline] Stage 1: Council');
  const architecture = await runCouncil(requirements);
  fs.writeFileSync(path.join(zoroDir, 'architecture.md'), architecture, 'utf8');

  // Stage 2: Planner — produce task breakdown
  log('[pipeline] Stage 2: Planner');
  const taskBreakdown = await runPlanner(architecture);
  fs.writeFileSync(path.join(zoroDir, 'task-breakdown.md'), taskBreakdown, 'utf8');

  // Stage 3: Coder + Debugger — implement each task
  const tasks = parseTasks(taskBreakdown);
  if (tasks.length === 0) throw new Error('Planner returned no executable tasks');
  const results = [];

  for (const task of tasks) {
    log(`[pipeline] Stage 3: Coder — Task ${task.number}: ${task.title}`);
    if (hooks.onTaskStart) hooks.onTaskStart(task);

    // Auto-discover existing source files so Aider sees what's already there
    const existingFiles = discoverSourceFiles(workspace);
    const coderResult = await runCoder(task.text, { workspace, readFiles, srcDirs: [...srcDirs, ...existingFiles], taskNumber: task.number });

    if (coderResult.passed) {
      results.push({ task: task.title, status: 'passed', attempts: 1 });
      if (hooks.onTaskDone) hooks.onTaskDone(task, 'passed');
      continue;
    }

    // Coder failed — escalate to Debugger
    log(`[pipeline] Stage 4: Debugger — Task ${task.number}: ${task.title}`);
    try {
      const debugFiles = discoverSourceFiles(workspace);
      const debugResult = await runDebugger(task.text, {
        workspace,
        failureOutput: coderResult.tests.output,
        readFiles,
        srcDirs: [...srcDirs, ...debugFiles],
      });
      results.push({ task: task.title, status: 'passed', attempts: 1 + debugResult.attempts });
      if (hooks.onTaskDone) hooks.onTaskDone(task, 'passed');
    } catch (err) {
      if (err.message.startsWith('DebuggerEscalated')) {
        results.push({ task: task.title, status: 'escalated' });
        if (hooks.onTaskDone) hooks.onTaskDone(task, 'escalated');
        throw new Error(
          `PipelineEscalated at task "${task.title}": ${err.message}`
        );
      }
      throw err;
    }
  }

  return { status: 'complete', tasks: results };
}

module.exports = { runPipeline };
