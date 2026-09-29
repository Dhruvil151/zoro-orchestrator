function coderMessage(task, taskNumber = 1) {
  const preserveNote = taskNumber > 1
    ? `\nIMPORTANT — This is task ${taskNumber} in a sequence. Previous tasks have already created working files.
- DO NOT remove, rename, or break any existing exports or functions
- Only ADD new code; preserve everything that already exists and passes tests\n`
    : '';

  return `You are implementing a software task. Read the task carefully and write the code.
${preserveNote}
${task}

Rules:
- Write complete, working implementations — no stubs, no TODOs
- Follow the acceptance criteria exactly
- Use named exports matching what any test file expects
- Do not modify test files

Module system — IMPORTANT:
- Use CommonJS throughout: \`require()\` / \`module.exports\` / \`exports.X\`
- Do NOT use ES module syntax (\`import\`, \`export\`, \`export default\`) unless the task explicitly requires it
- If you must use ESM, set \`"type": "module"\` in package.json AND configure Jest with \`--experimental-vm-modules\`

Docker test harness (REQUIRED — create these if they don't exist):
- \`Dockerfile\` — MUST use BuildKit cache mount so npm install is fast even when package.json changes:
  \`\`\`dockerfile
  # syntax=docker/dockerfile:1
  FROM node:18-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN --mount=type=cache,target=/root/.npm npm install
  COPY . .
  CMD ["npm", "test"]
  \`\`\`
- \`docker-compose.yml\` (no \`version:\` field — it is obsolete):
  \`\`\`yaml
  services:
    test:
      build: .
  \`\`\`
- \`package.json\` must have a \`"test"\` script that runs all tests (e.g. \`"test": "jest"\`)
- Jest config: add \`"jest": { "testEnvironment": "node" }\` in package.json
- Do NOT use watch mode or interactive runners`;
}

module.exports = { coderMessage };
