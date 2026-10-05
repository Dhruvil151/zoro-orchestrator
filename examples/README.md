# A reproducible live-run walkthrough

**Status: instructions, not a completed live demonstration.** The current portfolio refresh found no running Docker engine and no Aider executable on PATH. No successful live result is claimed.

## Input

Use a small, bounded request:

```text
Build a Node.js TODO API with POST /todos, GET /todos, and PATCH /todos/:id. Use in-memory storage. Reject empty titles, return 404 for unknown IDs, and include meaningful tests for create, list, update, and invalid input. Do not call external services from the generated app.
```

## Run

1. Install Node.js, Docker with a running engine, Python and Aider. Configure provider keys and model IDs using the technical guide.
2. Use a disposable environment without unrelated secrets. Generated code and Dockerfiles are not inherently safe.
3. Run `npm ci` and `npm test` to check the offline orchestration behavior.
4. Run `node cli.js "Build a Node.js TODO API with POST /todos, GET /todos, and PATCH /todos/:id. Use in-memory storage. Reject empty titles, return 404 for unknown IDs, and include meaningful tests for create, list, update, and invalid input."`.

## Inspect the artifacts

Each run creates a new workspace. The CLI and pipeline save:

- `.zoro/requirements.md`: the original request.
- `.zoro/architecture.md`: synthesized architecture.
- `.zoro/task-breakdown.md`: planner output.
- `.zoro/tasks/`: individual task descriptions.
- `.zoro/run.log`: progress and task outcomes.
- Generated application files in the workspace.

Inspect the generated application independently: start it, create a TODO, list it, update it, submit an empty title, and request an unknown ID. Check that the tests contain assertions for those behaviors rather than only checking that a process exits.

## Evidence needed before calling a run successful

Record commit, date, provider/model IDs, elapsed time, task count, repair attempts and final outcomes. Include sanitized generated source and test output. Record failed attempts too. Remove credentials, private paths and unrelated personal data before publishing artifacts.

Offline tests use mocks. They establish orchestration behavior; they are not evidence that a model generated a correct TODO API.

[Technical setup](../docs/TECHNICAL_GUIDE.md) · [Back to the project](../README.md)
