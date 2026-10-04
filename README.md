# Zoro Orchestrator

**From a software request to a reviewed coding attempt.**

An experimental pipeline that coordinates AI models to plan an application, ask a coding tool to implement it, and use test feedback for bounded repair attempts.

For exploring how planning, implementation, and feedback can be connected in an AI-assisted development workflow.

![Compare design drafts → Plan and implement → Test and review. Conceptual workflow.](docs/overview.svg)

[Quick start](#try-it-locally) · [Technical guide](docs/TECHNICAL_GUIDE.md) · [Checks](https://github.com/Dhruvil151/zoro-orchestrator/actions) · [Portfolio](https://github.com/Dhruvil151)

## A simple example

Given a request for a small TODO API, the pipeline proposes an architecture, creates tasks, invokes Aider, and runs the generated test container. Failed tasks get a limited repair loop before manual review is needed.

## What it does

- Requires a quorum of successful architecture proposals.
- Combines proposals into a plan and implementation tasks.
- Creates a separate workspace for each run.
- Stops after bounded repair attempts and saves run artifacts.

## Try it locally

```sh
npm ci
npm test
```

The offline suite requires no provider credentials. For a live run, install Node.js 22 or 24, Docker, Python, and Aider; configure your own provider credentials and models as described in the technical guide.

## How it is built

**Node.js · JavaScript · Groq · Gemini · Aider · Docker · Jest**

Failures are explicit: empty plans are rejected, repair attempts are bounded, and missing tests are not replaced with placeholder successes. The aim is an inspectable workflow, not an unsupported claim of autonomous correctness.

See the [technical guide](docs/TECHNICAL_GUIDE.md) for setup details, architecture, and implementation boundaries.

## Checks and evidence

```sh
npm test
```

Live runs call external services and execute generated code. Use an isolated development environment and inspect outputs. Docker builds are not a security boundary for arbitrary generated instructions.

The [publication validation report](VALIDATION.md) records earlier checks and their limits. GitHub Actions records checks for subsequent commits.

## Current scope

Local prototype. Offline orchestration tests mock providers, Aider, and Docker. A complete live generation run has not been verified in the published validation report.

