# SDK lock snapshots

- `package-lock.alpha.json` mirrors the committed root lock for Harness 0.2.1-alpha.1.
- `package-lock.rc2.json` fixes Harness 0.2.0-rc.2, Cordis 4.0.4, Loader 1.0.5 and Include 1.0.9.

`scripts/select-test-harness.mjs` selects the manifest and matching v3 lock before CI runs npm ci. It fails on stale dependency/peer/engine metadata. Root development stays on alpha. Keep both snapshots current after dependency or version changes; see CONTRIBUTING.md. Dependabot PRs require this refresh and SDK validation before merging; no automatic merges are configured.

Snapshots use the official npm registry and package integrity fields, with no credentials or local paths. npm 11 is recommended for dependency updates: npm 10.9.3 encountered an internal peer-graph error when resolving the Vitest 3→4 security upgrade. Clean installation from these locks is verified separately.
