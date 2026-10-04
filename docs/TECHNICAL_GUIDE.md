[← Project overview](../README.md)

# Zoro Orchestrator

An experimental AI coding pipeline that turns a software request into architecture, implementation tasks, generated code, and Docker-based test feedback.

## Pipeline

1. Council: multiple model calls produce architecture drafts; at least two must succeed.
2. Moderator: synthesizes successful drafts into one architecture document.
3. Planner: converts the architecture into numbered implementation tasks.
4. Coder: invokes Aider in a dedicated workspace, then runs the generated test container.
5. Debugger: retries failed tasks through a bounded three-attempt repair ladder, then escalates to manual review.

The pipeline saves requirements, architecture, task breakdown, task files, and a run log beneath the generated workspace's .zoro directory. An empty task plan is rejected. It does not create placeholder passing tests when an agent fails to write tests.

## Status

This is a local prototype with mocked orchestration tests, not a production autonomous development service. A green generated test suite does not establish that the requested product is correct or secure. Inspect generated code and acceptance tests yourself.

## Prerequisites

- Node.js 22 or 24 and npm.
- Docker with Compose, running locally.
- Python and Aider installed so the aider command is on PATH.
- Your own Groq and Gemini credentials and access to the configured models.

Install Aider following its official documentation: https://aider.chat/docs/install.html. Provider access and model identifiers change; configure available models in .env rather than assuming every account has the defaults.

## Setup and run

~~~sh
npm ci
~~~

Copy .env.example to .env and supply credentials. Check that node --version, docker compose version, and aider --version work before starting.

~~~sh
npm start -- "Build a Node.js TODO API with validation and meaningful API tests"
~~~

By default, outputs go to workspaces/ inside this repository. Set ZORO_WORK_ROOT to another dedicated directory if needed. Each run creates a new directory and will not overwrite an existing project with the same request name.

The preflight checks configured providers, then the pipeline invokes paid/network APIs and executes Aider and generated Docker builds. Run on a disposable development environment without unrelated secrets. Docker tests are **not a security boundary** for arbitrary generated Dockerfiles; Aider runs on the host with inherited provider credentials.

## Model configuration

The council uses COUNCIL_GROQ_MODEL_A, COUNCIL_GROQ_MODEL_B, and GEMINI_MODEL. The moderator uses GEMINI_MODEL. PLANNER_GROQ_MODEL selects the planner primary; Gemini is its fallback. CODER_MODEL and CODER_FALLBACK_MODEL use Aider provider-prefixed model IDs; the repair ladder alternates those choices. The optional Ollama adapter exists in source but is not an active default council member.

## Tests

~~~sh
npm test
~~~

Tests mock model calls, Aider, and Docker to verify quorum, fallback behavior, task parsing, repair limits, and pipeline sequencing. No live credentials are needed. Full provider-backed generation is a separate integration exercise.

## Layout

- cli.js — command-line entry and run artifacts.
- controller/council — provider adapters, drafts, and moderation.
- controller/planner — task planning and fallback.
- controller/coder — Aider invocation and Docker test runner.
- controller/debugger — bounded repair attempts.
- controller/pipeline — sequencing, task parsing, and workspace management.
- tests/ — offline orchestration tests.

## Limitations

The Docker test harness currently assumes a test service built from the workspace Dockerfile and replaces docker-compose.yml with that convention. Do not use this prototype against an existing application directory. Model failures, quotas, and incomplete generated tests can stop or mislead a run. The repository intentionally excludes private run histories, hardware/access notes, credentials, and unrelated TTS benchmarks.

## Review results

See [publication validation](../VALIDATION.md) for the checks performed, fixes, and unverified integrations.

