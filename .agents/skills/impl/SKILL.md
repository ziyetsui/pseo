---
name: impl
description: Implement an approved project specification in verified phases. Use when the relevant behavior and acceptance criteria are already clear enough to build, test, and hand off.
---

# Impl

Implement the relevant contract from `specs/` and finish with evidence.

## Workflow

1. Read the governing spec, related research, and the project's existing conventions.
2. Break the work into dependency-ordered, verifiable phases.
3. Implement the smallest complete phase without expanding scope.
4. Run the lightest reliable build, test, lint, typecheck, or visual checks for the changed surface.
5. Reconcile any mismatch between code and spec before proceeding.
6. Report changed files, verification results, deferred issues, and the next safe action.

Put durable implementation decisions, verification evidence, or handoff notes in `docs/` when they will help future work. Do not claim completion from an unverified scaffold or silently change the specification.

