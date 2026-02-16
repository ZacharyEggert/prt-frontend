# P-007 macOS Production Build Verification

Date: February 16, 2026  
Task: `P-007`  
Scope: Verify macOS production build, packaged runtime integrity, CSP, bundled PRT logic, app size, and critical-path smoke flows.

## 1. Required Gate Sequence

Commands were run in the required order and all passed:

1. `bun run typecheck` ✅
2. `bun run lint` ✅
3. `bun run format` ✅ (no file changes)
4. `bun run test -- --run` ✅ (27 files, 206 tests)
5. `bun run build` ✅

## 2. macOS Packaging Build

Command:

- `bun run build:mac` ✅

Produced artifacts:

- `dist/prt-frontend-1.0.0.dmg`
- `dist/prt-frontend-1.0.0-arm64-mac.zip`
- `dist/mac-arm64/prt-frontend.app`

Checksums (`shasum -a 256`):

- `dist/prt-frontend-1.0.0.dmg`  
  `800d2171b9a69eaf5b922095f5b5d3ee82b6c9de9fa5ad02e5168e05d232beca`
- `dist/prt-frontend-1.0.0-arm64-mac.zip`  
  `209276a13951a19d6431cf342de12c6d29d5c2fb0a8a48c4634c0cd1843439b6`

Sizes (`du -sh`):

- DMG: `112M`
- ZIP: `113M`
- `.app`: `299M`

## 3. Bundle Metadata Verification

From `dist/mac-arm64/prt-frontend.app/Contents/Info.plist`:

- `CFBundleIdentifier = com.prt.frontend` ✅
- `CFBundleName = prt-frontend` ✅

## 4. Packaged CSP Verification

Extracted `out/renderer/index.html` from packaged `app.asar` and verified:

- `default-src 'self'` ✅
- `script-src 'self'` ✅
- `style-src 'self' 'unsafe-inline'` ✅
- `img-src 'self' data:` ✅

Observed CSP content:

```html
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
```

## 5. PRT Bundling Integrity Verification

Extracted packaged `out/main/index.js` from `app.asar` and verified:

- No unresolved runtime import string for `project-roadmap-tracking` ✅
- Expected inlined service symbols and logic present ✅
  - `TaskService`
  - `RoadmapService`
  - `readRoadmapFile`
  - `writeRoadmapFile`

Conclusion: PRT service logic is bundled into packaged main output and resolves at runtime.

## 6. Critical-Path Smoke Verification (Packaged Runtime)

Fixture projects created in `/tmp`:

- `/tmp/prt-p007-a` (`prt init --withSampleTasks`)
- `/tmp/prt-p007-b` (`prt init`)

Smoke execution method:

- Launched packaged app with `env -u ELECTRON_RUN_AS_NODE ... --remote-debugging-port=9222`
- Drove packaged renderer runtime via CDP script (`/tmp/p007-cdp-smoke.mjs`)
- Captured smoke results in `/tmp/p007-smoke-result.json`

Important environment note:

- Shell environment had `ELECTRON_RUN_AS_NODE=1` set globally.
- For runtime smoke this was explicitly unset for the packaged launch so Electron ran in app mode.

Smoke checks (all pass):

- App welcome UI rendered (`Browse for Project` button present) ✅
- Open project A ✅
- Dashboard data path: stats retrieval ✅
- Dependency graph data retrieval ✅
- Validation action returns result ✅
- Tasks list/search/filter/sort via runtime API ✅
- Task CRUD:
  - create ✅
  - update ✅
  - complete ✅
  - pass-test ✅
  - delete ✅
- Dependency add/remove ✅
- Save current project (A) ✅
- Project switch A -> B ✅
- Post-switch stats/tasks reflect project B state (0 tasks) ✅
- Save current project (B) ✅
- App process cleanup after smoke run ✅

## 7. Size Regression Check

Policy:

- Fail if DMG or ZIP > `130M`, or >15% above baseline (`112M` DMG / `113M` ZIP).

Observed:

- DMG: `112M`
- ZIP: `113M`

Result: No size regression ✅

## Final Result

All `P-007` acceptance checks passed:

- Required gates ✅
- Packaging ✅
- Metadata ✅
- CSP ✅
- Bundled PRT integrity ✅
- Critical-path smoke ✅
- Size policy ✅
