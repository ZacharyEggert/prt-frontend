# ARCHITECTURE.md

**Version:** 2.0.0  
**Last Updated:** 2026-02-16  
**Status:** Living document

## 1. Purpose

`prt-frontend` is an Electron desktop application for working with
[project-roadmap-tracking](https://github.com/ZacharyEggert/project-roadmap-tracking) (PRT)
projects through a GUI.

Design intent:

- Keep PRT as the source of truth (`prt.json`, `.prtrc.json`)
- Keep Electron main process thin (IPC + integration + filesystem boundary)
- Keep renderer focused on UI/state, not filesystem access
- Preserve a typed API boundary across main -> preload -> renderer

## 2. High-Level Architecture

```
Renderer (React + TanStack Query)
        <-> window.api (typed preload bridge)
Main (IPC handlers + PRT services + file watcher + menu)
        <-> filesystem (prt.json / .prtrc.json)
```

Three-process Electron model:

- **Main process** (`src/main/*`): window lifecycle, IPC handlers, menu wiring, file watching,
  PRT service execution
- **Preload process** (`src/preload/*`): typed `window.api` bridge and channel mapping
- **Renderer process** (`src/renderer/src/*`): pages/components/hooks, query cache, user flows

## 3. Directory and Responsibilities

```text
src/
├── main/
│   ├── index.ts                 # app/window lifecycle + handler registration
│   ├── menu.ts                  # native menu + command channel emission
│   └── ipc/
│       ├── index.ts             # registers all IPC domains
│       ├── utils.ts             # wrapHandler error formatting
│       ├── project.ipc.ts       # project open/init/save/validate/stats/metadata
│       ├── task.ipc.ts          # task list/get/add/update/complete/pass-test/delete
│       ├── deps.ipc.ts          # dependency graph/get/add/remove/validate/circular/sort
│       └── file-watcher.ts      # chokidar watcher + prt:file:changed events
├── preload/
│   ├── index.ts                 # contextBridge exposeInMainWorld('api')
│   └── index.d.ts               # PrtAPI and payload/result type contracts
└── renderer/
    └── src/
        ├── App.tsx              # app shell + view selection
        ├── pages/               # welcome/dashboard/tasks
        ├── hooks/               # project/tasks/deps/menu/file-change/navigation hooks
        ├── components/          # feature UI + shadcn/ui primitives
        └── lib/                 # query keys, query client, utilities, error copy
```

## 4. PRT Integration Strategy

### 4.1 Direct service imports in main process

Main process imports PRT modules directly from `project-roadmap-tracking/dist/*`.
No CLI output parsing is used for core operations.

Examples in use:

- `RoadmapService`
- `TaskService`
- `TaskQueryService`
- `TaskDependencyService`
- `ErrorHandlerService`
- `readRoadmapFile`, `writeRoadmapFile`

### 4.2 Current exception: project initialization

New project creation (`prt:project:init`) currently shells out to:

- `execFile('prt', ['init', '-n', <name>, '-d', <description>, '--withSampleTasks?'])`

Implication:

- `prt` CLI must be available on `PATH` for in-app project initialization

## 5. IPC API Inventory (Current)

All handlers are registered from `src/main/ipc/index.ts` and exposed through `window.api` in
`src/preload/index.ts`.

Channel naming convention:

- `prt:{domain}:{action}`

### 5.1 Project channels

| Channel | Args | Returns |
| --- | --- | --- |
| `prt:project:open` | `projectPath: string` | `Roadmap` |
| `prt:project:open-dialog` | none | `OpenDialogResult` |
| `prt:project:select-directory` | none | `DirectorySelectResult` |
| `prt:project:init` | `InitOptions` | `Roadmap` |
| `prt:project:save` | `roadmap: Roadmap` | `SaveResult` |
| `prt:project:save-current` | none | `SaveResult` |
| `prt:project:validate` | none | `ProjectValidationResult` |
| `prt:project:stats` | none | `RoadmapStats` |
| `prt:project:metadata` | none | `Roadmap['metadata']` |

### 5.2 Task channels

| Channel | Args | Returns |
| --- | --- | --- |
| `prt:task:list` | `options?: ListOptions` | `Task[]` |
| `prt:task:get` | `taskId: string` | `Task` |
| `prt:task:add` | `taskData: CreateTaskData` | `Task` |
| `prt:task:update` | `taskId: string`, `updates: Partial<Task>` | `Task` |
| `prt:task:complete` | `taskId: string` | `Task` |
| `prt:task:pass-test` | `taskId: string` | `Task` |
| `prt:task:delete` | `taskId: string` | `TaskDeleteResult` |

### 5.3 Dependency channels

| Channel | Args | Returns |
| --- | --- | --- |
| `prt:deps:graph` | none | `SerializableDependencyGraph` |
| `prt:deps:get` | `taskId: string` | `DependencyInfo` |
| `prt:deps:add` | `params: DepUpdate` | `DepUpdateResult` |
| `prt:deps:remove` | `params: DepUpdate` | `DepUpdateResult` |
| `prt:deps:validate` | none | `DependencyValidationError[]` |
| `prt:deps:detect-circular` | none | `CircularDependency \| null` |
| `prt:deps:sort` | none | `Task[]` |

### 5.4 Event channels

| Channel | Direction | Payload |
| --- | --- | --- |
| `prt:file:changed` | Main -> Renderer | `FileChangeEvent` |
| `prt:menu:command` | Main -> Renderer | `MenuCommand` |

Notes:

- `prt:file:changed` is emitted by chokidar-backed watcher logic in `src/main/ipc/file-watcher.ts`.
- Menu commands are emitted from `src/main/menu.ts` for `new-project`, `open-project`, and
  `save-project`.

## 6. Public Preload API Contract

`window.api` is typed by `PrtAPI` in `src/preload/index.d.ts`:

```ts
interface PrtAPI {
  project: ProjectAPI
  task: TaskAPI
  deps: DepsAPI
  onFileChanged: { subscribe: (callback: (event: FileChangeEvent) => void) => () => void }
  menu: { subscribe: (callback: (command: MenuCommand) => void) => () => void }
}
```

Key interfaces mirrored by the bridge:

- `InitOptions`
- `OpenDialogResult`
- `DirectorySelectResult`
- `SaveResult`
- `ProjectValidationResult`
- `ListOptions`
- `DepUpdate`
- `DepUpdateResult`
- `SerializableDependencyGraph`
- `FileChangeEvent`

## 7. Renderer State and Data Flow

### 7.1 State management

Renderer uses TanStack Query for server-like state over IPC.
Query domains are defined in `src/renderer/src/lib/query-keys.ts`:

- `project`
- `tasks`
- `deps`

### 7.2 View model

The app uses an internal navigation state (`welcome`, `dashboard`, `tasks`) rather than React
Router. `App.tsx` renders views conditionally via `useNavigation()`.

### 7.3 Cache invalidation behavior

- Mutations invalidate relevant domain keys in `use-project.ts`, `use-tasks.ts`, and `use-deps.ts`.
- External file changes (`prt:file:changed`) trigger invalidation for all three domains in
  `use-file-change-listener.ts`.

### 7.4 Menu command behavior

`use-app-menu-commands.ts` subscribes to `window.api.menu` and maps commands to UI flows:

- `open-project`: open native project dialog and navigate to dashboard
- `new-project`: navigate to welcome and trigger new-project directory selection
- `save-project`: call `project.saveCurrent` and toast status

## 8. Key Runtime Flows

### 8.1 Open existing project

1. Renderer calls `window.api.project.openDialog()`.
2. Main opens native directory picker.
3. Main resolves `prt.json`, reads roadmap, sets `currentProjectPath`, and starts watcher.
4. Renderer cache is refreshed and UI navigates to dashboard.

### 8.2 Create new project

1. Renderer gathers path/name/description/sample-task option.
2. Main executes `prt init` in selected directory.
3. Main reads generated `prt.json`, sets `currentProjectPath`, starts watcher.
4. Renderer invalidates/refreshes project/task/dependency queries.

### 8.3 Task mutation

1. Renderer mutation hook invokes task IPC channel.
2. Main reads current roadmap from `currentProjectPath`.
3. Main applies PRT service operation and writes updated roadmap.
4. File watcher self-write suppression avoids duplicate external-change refresh.
5. Mutation success invalidates affected query keys.

### 8.4 External CLI/file change

1. `prt.json` changes outside the app.
2. Chokidar watcher emits `prt:file:changed`.
3. Renderer invalidates `project`, `tasks`, `deps` caches.
4. Active queries refetch and UI updates.

## 9. Security Model

- **Context isolation**: enabled with preload bridge exposure.
- **Renderer Node access**: no direct Node API exposure; only curated `window.api` methods.
- **IPC surface**: restricted to explicit, typed methods; no raw renderer `ipcRenderer` access.
- **CSP** (`src/renderer/index.html`):
  - `default-src 'self'`
  - `script-src 'self'`
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data:`
- **BrowserWindow config** currently sets `sandbox: false` and uses preload boundary for API
  control.

## 10. Testing Architecture

Vitest is split into two configured projects (`vitest.config.ts`):

- **Backend project**
  - Include: `tests/backend/**/*.test.ts`
  - Environment: `node`
  - Setup: `tests/backend/setup.ts`

- **Renderer project**
  - Include: `tests/frontend/**/*.test.{ts,tsx}`
  - Environment: `jsdom`
  - Setup: `tests/frontend/setup.ts`

Coverage focus:

- Main IPC handler behavior
- File watcher and project-switching behavior
- Renderer hooks and components
- Accessibility-focused component tests for critical UI

## 11. Build and Distribution

### 11.1 Build scripts

- `bun run build` -> typecheck + `electron-vite build`
- `bun run build:mac` -> mac artifacts via electron-builder
- `bun run build:win` -> Windows NSIS installer
- `bun run build:linux` -> Linux targets

### 11.2 electron-builder reality (`electron-builder.yml`)

- `appId: com.prt.frontend`
- `productName: prt-frontend`
- mac config:
  - `identity: null`
  - `notarize: false`
- Default targets include:
  - macOS: DMG (and ZIP generated in release packaging context)
  - Windows: NSIS
  - Linux: AppImage, snap, deb

### 11.3 Release workflow (`.github/workflows/release-on-tagged-main.yml`)

On SemVer tag pushes pointing to `main`, CI builds:

- Linux AppImage
- macOS DMG
- Windows setup EXE

Artifacts are attached to GitHub release for the tag.

### 11.4 Unsigned macOS implication

Because builds are unsigned/unnotarized, macOS users may need quarantine removal or manual
"Open Anyway" approval before first launch.

## 12. Non-Goals and Constraints

- No separate app-owned database; `prt.json` remains system of record.
- No direct renderer import of PRT services.
- No documentation in this file implies API/runtime changes; this document describes current
  implementation.
