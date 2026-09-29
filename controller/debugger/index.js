const fs = require('fs');
const path = require('path');
const { runAider } = require('../coder/aider');
const { runDockerTests } = require('../coder/docker');
const { debuggerMessage } = require('./prompts');

function enforceDockerCompose(workspace) {
  const content = `services:\n  test:\n    build: .\n`;
  fs.writeFileSync(path.join(workspace, 'docker-compose.yml'), content, 'utf8');
}


// Automated ladder — 3 attempts with escalating model strength
const LADDER = [
  process.env.CODER_MODEL || 'groq/compound-mini',        // confirmed accessible, no daily quota issues
  process.env.CODER_FALLBACK_MODEL || 'gemini/gemini-2.5-flash',   // different family, fresh perspective
  process.env.CODER_MODEL || 'groq/compound-mini',        // third attempt with full accumulated failure context
];
const MAX_AUTOMATED_ATTEMPTS = LADDER.length;

async function runDebugger(task, { workspace, failureOutput, readFiles = [], srcDirs = [] } = {}) {
  const prevAttempts = [];
  let currentFailure = failureOutput;

  for (let attempt = 0; attempt < MAX_AUTOMATED_ATTEMPTS; attempt++) {
    const model = LADDER[attempt];
    const message = debuggerMessage(task, currentFailure, attempt + 1, prevAttempts);

    const aiderResult = await runAider({ model, workspace, message, readFiles, srcDirs });
    if (aiderResult.exitCode !== 0 || /RateLimitError|quota.*exhaust|RESOURCE_EXHAUSTED|rate.limit/i.test(aiderResult.stderr)) {
      currentFailure = 'The coding tool failed before completing its edits. Retry the original failing task.';
      prevAttempts.push({ attempt: attempt + 1, model, summary: currentFailure });
      continue;
    }
    enforceDockerCompose(workspace);
  
    const tests = await runDockerTests(workspace);

    if (tests.exitCode === 0 && tests.failed === 0) {
      return { passed: true, attempts: attempt + 1, tests };
    }

    prevAttempts.push({
      attempt: attempt + 1,
      model,
      summary: `${tests.passed} passed, ${tests.failed} failed after attempt ${attempt + 1} with ${model}`,
    });
    currentFailure = tests.output;

    process.stderr.write(
      `[debugger] attempt ${attempt + 1}/${MAX_AUTOMATED_ATTEMPTS} (${model}): still failing\n`
    );
  }

  throw new Error(
    `DebuggerEscalated: ${MAX_AUTOMATED_ATTEMPTS} automated attempts exhausted. Manual review required.`
  );
}

module.exports = { runDebugger };
