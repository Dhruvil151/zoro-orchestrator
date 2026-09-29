const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function runAider({ model, workspace, message, readFiles = [], srcDirs = [] }) {
  const msgFile = path.join(workspace, '.aider-message.txt');
  fs.writeFileSync(msgFile, message, 'utf8');

  const args = [
    '--model', model,
    '--edit-format', 'whole',
    '--no-git',
    '--yes-always',
    ...readFiles.flatMap((f) => ['--read', f]),
    '--message-file', msgFile,
    ...srcDirs,
  ];

  // Provider credentials are inherited through the environment, never argv.
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    // Also strip GCP env vars as belt-and-suspenders: point ADC to a nonexistent
    // file so the Google auth library can't load credentials from disk or env.
    env.GOOGLE_APPLICATION_CREDENTIALS = path.join(workspace, '.unused-google-credentials.json');
    for (const key of [
      'GOOGLE_CLOUD_PROJECT', 'GCLOUD_PROJECT', 'VERTEX_AI_PROJECT',
      'GOOGLE_CLOUD_KEYFILE_JSON', 'GOOGLE_OAUTH_ACCESS_TOKEN',
    ]) { delete env[key]; }

    const proc = spawn('aider', args, { cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    proc.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
    proc.on('error', reject);
  });
}

module.exports = { runAider };
