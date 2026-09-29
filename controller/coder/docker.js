const { spawn, spawnSync } = require('child_process');

const DOCKER_TIMEOUT_MS = 120_000; // 2 minutes — if Jest hangs (open handles, server not closed), kill it

async function runDockerTests(workspace) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'docker',
      ['compose', 'up', '--build', '--abort-on-container-exit', '--exit-code-from', 'test'],
      { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let output = '';
    proc.stdout.on('data', (d) => { output += d; process.stdout.write(d); });
    proc.stderr.on('data', (d) => { output += d; process.stderr.write(d); });

    const timer = setTimeout(() => {
      process.stderr.write(`[docker] timeout after ${DOCKER_TIMEOUT_MS / 1000}s — killing container\n`);
      proc.kill('SIGKILL');
      // Force-stop any lingering containers so the workspace is clean for the next attempt
      spawnSync('docker', ['compose', 'down', '--remove-orphans'], { cwd: workspace });
    }, DOCKER_TIMEOUT_MS);

    proc.on('close', (exitCode) => {
      clearTimeout(timer);
      // Extract only the container log lines (test runner output), strip Docker build noise
      const containerLines = output
        .split('\n')
        .filter((l) => /^(test-1\s*\||PASS|FAIL|Tests:|Test Suites:|\s+●|\s+✓|\s+✕|Error:|SyntaxError:)/.test(l))
        .map((l) => l.replace(/^test-1\s*\|\s*/, ''))
        .join('\n');
      const failureOutput = containerLines || output.slice(-3000); // fallback: last 3000 chars

      const passedMatch = output.match(/Tests:\s+(?:\d+ [^,]+, )*(\d+) passed/);
      const failedMatch = output.match(/Tests:\s+(\d+) failed/);
      const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      resolve({ exitCode: exitCode ?? 1, passed, failed, output: failureOutput });
    });

    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

module.exports = { runDockerTests };
