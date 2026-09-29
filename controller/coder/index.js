const fs = require('fs');
const path = require('path');
const { runAider } = require('./aider');
const { runDockerTests } = require('./docker');
const { coderMessage } = require('./prompts');

const PRIMARY_MODEL = process.env.CODER_MODEL || 'groq/compound-mini';        // confirmed accessible, generous quota
const FALLBACK_MODEL = process.env.CODER_FALLBACK_MODEL || 'gemini/gemini-2.5-flash';  // fallback if Groq fails

// Always enforce the canonical docker-compose.yml after Aider runs.
// LLMs frequently mutate it (adding `image:` with volumes, version fields, etc.)
// which breaks npm install inside the container. We own this file, not the LLM.
function enforceDockerCompose(workspace) {
  const content = `services:\n  test:\n    build: .\n`;
  fs.writeFileSync(path.join(workspace, 'docker-compose.yml'), content, 'utf8');
}


// Aider exits 0 even when it gives up after quota exhaustion — detect via stderr keywords.
function aiderQuotaFailed(result) {
  return /RateLimitError|quota.*exhaust|RESOURCE_EXHAUSTED|rate.limit/i.test(result.stderr);
}

async function runCoder(task, { workspace, readFiles = [], srcDirs = [], taskNumber = 1 } = {}) {
  const message = coderMessage(task, taskNumber);

  let aiderResult = await runAider({ model: PRIMARY_MODEL, workspace, message, readFiles, srcDirs });
  enforceDockerCompose(workspace);

  const primaryFailed = aiderResult.exitCode !== 0 || aiderQuotaFailed(aiderResult);
  if (primaryFailed) {
    const reason = aiderResult.exitCode !== 0 ? `exited ${aiderResult.exitCode}` : 'quota exhausted';
    process.stderr.write(`[coder] primary (${PRIMARY_MODEL}) ${reason} — trying fallback\n`);
    aiderResult = await runAider({ model: FALLBACK_MODEL, workspace, message, readFiles, srcDirs });
    enforceDockerCompose(workspace);
  
    if (aiderResult.exitCode !== 0 || aiderQuotaFailed(aiderResult)) {
      throw new Error(
        `Coder failed: both primary and fallback Aider exited non-zero.\nStderr: ${aiderResult.stderr}`
      );
    }
  }

  const tests = await runDockerTests(workspace);
  // Exit code is the source of truth — custom test scripts may not output "X passed" format
  const passed = tests.exitCode === 0 && tests.failed === 0;

  return { aider: aiderResult, tests, passed };
}

module.exports = { runCoder };
