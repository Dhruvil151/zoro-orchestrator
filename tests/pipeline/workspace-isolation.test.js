const fs = require('fs');
const os = require('os');
const path = require('path');
const {createWorkspace} = require('../../controller/pipeline/workspace');
test('repeated requirements create isolated workspaces and preserve earlier files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zoro-workspace-test-'));
  try {
    const first = createWorkspace('same task', root);
    fs.writeFileSync(path.join(first.projectDir, 'keep.txt'), 'original');
    const second = createWorkspace('same task', root);
    expect(first.projectDir).not.toBe(second.projectDir);
    expect(fs.readFileSync(path.join(first.projectDir, 'keep.txt'), 'utf8')).toBe('original');
    const unusual = createWorkspace('../../', root);
    expect(path.dirname(unusual.projectDir)).toBe(root);
    expect(unusual.projectDir).not.toBe(root);
  } finally {
    fs.rmSync(root, {recursive:true, force:true});
  }
});
