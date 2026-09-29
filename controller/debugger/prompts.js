function debuggerMessage(task, failureOutput, attemptNum, prevAttempts = []) {
  let msg = `You are fixing failing tests. The original task was:\n\n${task}\n\n`;
  msg += `## Current test failures\n\n\`\`\`\n${failureOutput}\n\`\`\`\n\n`;

  if (prevAttempts.length > 0) {
    msg += `## Previous fix attempts (all failed)\n\n`;
    prevAttempts.forEach((a) => {
      msg += `### Attempt ${a.attempt} (${a.model})\n${a.summary}\n\n`;
    });
    msg += `Try a different approach.\n\n`;
  }

  msg += `Fix the implementation so all tests pass. Do not modify any test files.`;
  return msg;
}

module.exports = { debuggerMessage };
