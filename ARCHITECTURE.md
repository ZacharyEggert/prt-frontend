# ARCHITECTURE.md

**Version:** 1.0.0
**Last Updated:** 2026-02-10
**Status:** Living document — evolves with the codebase

## Table of Contents

1. [Architectural Vision](#architectural-vision)
2. [System Architecture](#system-architecture)
3. [PRT Integration](#prt-integration)
4. [IPC API Design](#ipc-api-design)
5. [Directory Structure](#directory-structure)
6. [State Management](#state-management)
7. [UI Layer](#ui-layer)
8. [Data Flow](#data-flow)
9. [Type System](#type-system)
10. [Security](#security)
11. [Testing Strategy](#testing-strategy)
12. [Build & Distribution](#build--distribution)

---

## Architectural Vision

### Purpose

prt-frontend provides a desktop GUI for [project-roadmap-tracking](https://github.com/ZacharyEggert/project-roadmap-tracking) (PRT). It exposes every operation available in the PRT CLI — task CRUD, dependency management, filtering, sorting, validation, and roadmap statistics — through a visual interface.

### Core Principles

**Thin Main Process**
The Electron main process acts as a bridge between the renderer and PRT services. It imports PRT services directly, handles IPC, and manages file system access. No business logic lives here — PRT owns that.

**Renderer Owns the UI, Not the Data**
The React renderer drives the user interface and user interaction. All data access goes through IPC to the main process. The renderer never touches the file system or imports PRT directly.

**PRT Is the Source of Truth**
All task data lives in `prt.json` files managed by PRT's services. prt-frontend does not maintain a separate data store, database, or cache beyond TanStack Query's in-memory cache for the current session.

**One Project at a Time**
The app opens a single project directory and works with its `prt.json` and `.prtrc.json`. Users can switch projects, but only one is active at any time.

### Design Goals

- **Feature parity** with the PRT CLI — every CLI operation should be available in the GUI
- **Responsive feedback** — optimistic updates via TanStack Query for snappy interactions
- **Type safety end-to-end** — shared types from PRT flow through main, preload, and renderer
- **Accessible** — keyboard navigation, screen reader support via shadcn/ui primitives

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React 19 + TypeScript                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │  │
│  │  │  Pages/  │  │  Compo-  │  │   shadcn/ui +  │   │  │
│  │  │  Views   │  │  nents   │  │   Tailwind CSS │   │  │
│  │  └────┬─────┘  └────┬─────┘  └────────────────┘   │  │
│  │       └──────┬───────┘                            │  │
│  │        ┌─────▼──────┐                             │  │
│  │        │  TanStack  │  Async state, caching,      │  │
│  │        │   Query    │  optimistic updates         │  │
│  │        └─────┬──────┘                             │  │
│  └──────────────┼────────────────────────────────────┘  │
│                 │ invoke / on                           │
│  ┌──────────────▼────────────────────────────────────┐  │
│  │           Preload (Context Bridge)                │  │
│  │     Typed API surface exposed to renderer         │  │
│  └──────────────┬────────────────────────────────────┘  │
└─────────────────┼───────────────────────────────────────┘
                  │ IPC (ipcMain.handle / ipcRenderer.invoke)
┌─────────────────┼────────────────────────────────────────┐
│                 │          Main Process                   │
│  ┌──────────────▼────────────────────────────────────┐  │
│  │             IPC Handler Layer                     │  │
│  │   Routes IPC channels to PRT service calls        │  │
│  └──────────────┬────────────────────────────────────┘  │
│                 │                                        │
│  ┌──────────────▼────────────────────────────────────┐  │
│  │          PRT Services (direct import)             │  │
│  │  TaskService, TaskQueryService, RoadmapService,   │  │
│  │  TaskDependencyService, DisplayService,           │  │
│  │  ErrorHandlerService                              │  │
│  └──────────────┬────────────────────────────────────┘  │
│                 │                                        │
│  ┌──────────────▼────────────────────────────────────┐  │
│  │          PRT Repository Layer                     │  │
│  │  RoadmapRepository (LRU cache, file watching)     │  │
│  │  ConfigRepository (multi-level inheritance)       │  │
│  └──────────────┬────────────────────────────────────┘  │
│                 │                                        │
│  ┌──────────────▼────────────────────────────────────┐  │
│  │            File System                            │  │
│  │         prt.json  /  .prtrc.json                  │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Process Boundaries

| Process      | Responsibilities                                                                              |
| ------------ | --------------------------------------------------------------------------------------------- |
| **Main**     | Window management, IPC handling, PRT service calls, file system access, native dialogs, menus |
| **Preload**  | Context bridge — exposes a typed, minimal API surface from main to renderer                   |
| **Renderer** | UI rendering, user interaction, state management, query caching                               |

---

## PRT Integration

### Strategy: Direct Service Imports

The main process imports PRT services directly from the compiled `dist/` directory. This gives full type safety, eliminates CLI output parsing, and provides access to PRT's complete API.

### Import Paths

PRT uses ES modules. All imports must reference `/dist/` paths with `.js` extensions:

```typescript
// Services
import roadmapService from 'project-roadmap-tracking/dist/services/roadmap.service.js'
import taskService from 'project-roadmap-tracking/dist/services/task.service.js'
import taskQueryService from 'project-roadmap-tracking/dist/services/task-query.service.js'
import taskDependencyService from 'project-roadmap-tracking/dist/services/task-dependency.service.js'
import displayService from 'project-roadmap-tracking/dist/services/display.service.js'
import errorHandlerService from 'project-roadmap-tracking/dist/services/error-handler.service.js'

// Utilities
import { readConfigFile } from 'project-roadmap-tracking/dist/util/read-config.js'

// Types
import {
  Roadmap,
  Task,
  Config,
  TASK_TYPE,
  STATUS,
  PRIORITY,
  TaskID,
  Tag
} from 'project-roadmap-tracking/dist/util/types.js'

// Errors
import {
  PrtError,
  TaskNotFoundError,
  ValidationError
} from 'project-roadmap-tracking/dist/errors/index.js'
```

### Available PRT Services

| Service                 | Key Methods                                                               | GUI Usage                                             |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `roadmapService`        | `load`, `save`, `validate`, `getStats`                                    | Open/save projects, validation view, dashboard stats  |
| `taskService`           | `createTask`, `addTask`, `updateTask`, `findTask`, `generateNextId`       | Task creation form, inline editing, task detail panel |
| `taskQueryService`      | `filter`, `search`, `sort`, `getByStatus`, `getByType`                    | List filtering, search bar, column sorting            |
| `taskDependencyService` | `buildGraph`, `detectCircular`, `validateDependencies`, `getBlockedTasks` | Dependency graph view, validation warnings            |
| `errorHandlerService`   | `handleError`, `formatErrorMessage`                                       | Error toasts, validation error display                |

---

## IPC API Design

IPC uses Electron's `ipcMain.handle` / `ipcRenderer.invoke` pattern for request-response communication. Each channel maps to a PRT operation.

### Channel Naming Convention

```
prt:{domain}:{action}
```

### Channels

#### Project

| Channel                   | Args                                       | Returns            | Description                                     |
| ------------------------- | ------------------------------------------ | ------------------ | ----------------------------------------------- |
| `prt:project:open`        | `dirPath: string`                          | `Roadmap`          | Open a project directory, load config + roadmap |
| `prt:project:open-dialog` | —                                          | `Roadmap \| null`  | Show native directory picker, then load         |
| `prt:project:init`        | `{ name, description?, withSampleTasks? }` | `Roadmap`          | Initialize a new PRT project                    |
| `prt:project:save`        | `roadmap: Roadmap`                         | `void`             | Save the current roadmap                        |
| `prt:project:validate`    | —                                          | `ValidationResult` | Validate roadmap integrity                      |
| `prt:project:stats`       | —                                          | `RoadmapStats`     | Get roadmap statistics                          |

#### Tasks

| Channel              | Args                                   | Returns  | Description                                |
| -------------------- | -------------------------------------- | -------- | ------------------------------------------ |
| `prt:task:list`      | `{ filters?, sort?, search? }`         | `Task[]` | List tasks with optional filtering/sorting |
| `prt:task:get`       | `taskId: TaskID`                       | `Task`   | Get a single task by ID                    |
| `prt:task:add`       | `{ title, type, details?, priority? }` | `Task`   | Create a new task                          |
| `prt:task:update`    | `{ taskId, updates }`                  | `Task`   | Update task properties                     |
| `prt:task:complete`  | `taskId: TaskID`                       | `Task`   | Mark a task as complete                    |
| `prt:task:pass-test` | `taskId: TaskID`                       | `Task`   | Mark a task as passing tests               |
| `prt:task:delete`    | `taskId: TaskID`                       | `void`   | Remove a task                              |

#### Dependencies

| Channel           | Args                                                  | Returns                                 | Description                     |
| ----------------- | ----------------------------------------------------- | --------------------------------------- | ------------------------------- |
| `prt:deps:get`    | `taskId: TaskID`                                      | `{ dependsOn: Task[], blocks: Task[] }` | Get task dependencies           |
| `prt:deps:add`    | `{ taskId, dependsOn?: TaskID[], blocks?: TaskID[] }` | `Task`                                  | Add dependency relationships    |
| `prt:deps:remove` | `{ taskId, dependsOn?: TaskID[], blocks?: TaskID[] }` | `Task`                                  | Remove dependency relationships |
| `prt:deps:graph`  | —                                                     | `DependencyGraph`                       | Get full dependency graph       |

#### File Watching

| Channel            | Direction       | Payload   | Description                                        |
| ------------------ | --------------- | --------- | -------------------------------------------------- |
| `prt:file:changed` | Main → Renderer | `Roadmap` | Notify renderer when `prt.json` changes externally |

### Preload API Shape

```typescript
// Exposed on window.api
interface PrtAPI {
  project: {
    open(dirPath: string): Promise<Roadmap>
    openDialog(): Promise<Roadmap | null>
    init(opts: InitOptions): Promise<Roadmap>
    save(roadmap: Roadmap): Promise<void>
    validate(): Promise<ValidationResult>
    stats(): Promise<RoadmapStats>
  }
  task: {
    list(opts?: ListOptions): Promise<Task[]>
    get(taskId: TaskID): Promise<Task>
    add(data: CreateTaskData): Promise<Task>
    update(taskId: TaskID, updates: Partial<Task>): Promise<Task>
    complete(taskId: TaskID): Promise<Task>
    passTest(taskId: TaskID): Promise<Task>
    delete(taskId: TaskID): Promise<void>
  }
  deps: {
    get(taskId: TaskID): Promise<DependencyInfo>
    add(taskId: TaskID, deps: DepUpdate): Promise<Task>
    remove(taskId: TaskID, deps: DepUpdate): Promise<Task>
    graph(): Promise<DependencyGraph>
  }
  onFileChanged(callback: (roadmap: Roadmap) => void): () => void
}
```

---

## Directory Structure

### Current (scaffold)

```
src/
├── main/
│   └── index.ts
├── preload/
│   ├── index.ts
│   └── index.d.ts
└── renderer/
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── env.d.ts
        ├── assets/
        │   ├── base.css
        │   └── main.css
        └── components/
            └── Versions.tsx
```

### Planned

```
src/
├── main/
│   ├── index.ts                    # Window creation, app lifecycle
│   └── ipc/
│       ├── index.ts                # Register all IPC handlers
│       ├── project.ipc.ts          # Project open/save/validate/stats handlers
│       ├── task.ipc.ts             # Task CRUD handlers
│       └── deps.ipc.ts             # Dependency handlers
├── preload/
│   ├── index.ts                    # Context bridge setup
│   └── index.d.ts                  # Shared type definitions for window.api
└── renderer/
    ├── index.html
    └── src/
        ├── main.tsx                # React root + QueryClientProvider
        ├── App.tsx                 # Root layout + routing
        ├── env.d.ts
        ├── lib/
        │   └── utils.ts            # shadcn/ui cn() helper
        ├── hooks/
        │   ├── use-tasks.ts        # TanStack Query hooks for task operations
        │   ├── use-project.ts      # TanStack Query hooks for project operations
        │   └── use-deps.ts         # TanStack Query hooks for dependency operations
        ├── components/
        │   ├── ui/                  # shadcn/ui components (button, dialog, etc.)
        │   ├── task-list.tsx        # Filterable, sortable task table
        │   ├── task-detail.tsx      # Task detail panel / modal
        │   ├── task-form.tsx        # Create/edit task form
        │   ├── dependency-graph.tsx # Visual dependency graph
        │   ├── project-stats.tsx    # Dashboard statistics
        │   ├── validation-panel.tsx # Validation results display
        │   ├── filter-bar.tsx       # Status/type/priority filter controls
        │   └── search-bar.tsx       # Text search input
        ├── pages/
        │   ├── dashboard.tsx        # Project overview with stats
        │   ├── tasks.tsx            # Task list view
        │   └── welcome.tsx          # No-project-open landing page
        └── assets/
            └── globals.css          # Tailwind directives + CSS variables
```

---

## State Management

### TanStack Query

All PRT data is treated as asynchronous server-like state accessed over IPC. TanStack Query handles caching, background refetching, and optimistic updates.

### Query Keys

```typescript
const queryKeys = {
  project: {
    root: ['project'] as const,
    stats: ['project', 'stats'] as const,
    validation: ['project', 'validation'] as const
  },
  tasks: {
    root: ['tasks'] as const,
    list: (filters?: ListOptions) => ['tasks', 'list', filters] as const,
    detail: (id: TaskID) => ['tasks', 'detail', id] as const
  },
  deps: {
    root: ['deps'] as const,
    detail: (id: TaskID) => ['deps', 'detail', id] as const,
    graph: ['deps', 'graph'] as const
  }
}
```

### Example Hook

```typescript
// hooks/use-tasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useTasks(filters?: ListOptions) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => window.api.task.list(filters)
  })
}

export function useAddTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTaskData) => window.api.task.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.project.stats })
    }
  })
}
```

### External File Changes

When PRT's `RoadmapRepository` detects an external file change (e.g., a CLI command ran in the terminal), the main process sends a `prt:file:changed` event. The renderer listens for this and invalidates all queries:

```typescript
useEffect(() => {
  const unsubscribe = window.api.onFileChanged(() => {
    queryClient.invalidateQueries()
  })
  return unsubscribe
}, [queryClient])
```

---

## UI Layer

### shadcn/ui + Tailwind CSS

Components are sourced from [shadcn/ui](https://ui.shadcn.com/) — copy-pasted into `src/renderer/src/components/ui/` for full ownership and customization.

### Key UI Components Planned

| Component        | shadcn/ui Base              | Purpose                          |
| ---------------- | --------------------------- | -------------------------------- |
| Task table       | `Table`, `DataTable`        | Filterable, sortable task list   |
| Task form        | `Form`, `Input`, `Select`   | Create and edit tasks            |
| Task detail      | `Sheet` or `Dialog`         | Full task view with dependencies |
| Filter bar       | `Select`, `Badge`, `Toggle` | Filter by status, type, priority |
| Search           | `Input`                     | Full-text task search            |
| Stats cards      | `Card`                      | Dashboard statistics             |
| Validation       | `Alert`, `Accordion`        | Validation results display       |
| Dependency graph | Custom (canvas/SVG)         | Visual dependency visualization  |
| Toasts           | `Toast`/`Sonner`            | Success/error feedback           |
| Command palette  | `Command`                   | Quick task switching and actions |

### Theming

Tailwind CSS with CSS custom properties for theming. Dark mode support via Tailwind's `dark:` variant, respecting system preference.

---

## Data Flow

### Read Flow (e.g., listing tasks)

```
User navigates to Tasks page
         │
    React component mounts
         │
    useTasks() hook fires
         │
    TanStack Query checks cache
         │
    Cache miss → window.api.task.list(filters)
         │
    Preload → ipcRenderer.invoke('prt:task:list', filters)
         │
    Main process IPC handler
         │
    roadmapService.load(config.path)
         │
    taskQueryService.filter(tasks, filters)
         │
    Returns Task[] → renderer → TanStack Query caches → UI renders
```

### Write Flow (e.g., adding a task)

```
User fills out task form, clicks Submit
         │
    useAddTask().mutate(formData)
         │
    window.api.task.add(formData)
         │
    Preload → ipcRenderer.invoke('prt:task:add', formData)
         │
    Main process IPC handler
         │
    roadmapService.load(config.path)
         │
    taskService.generateNextId(roadmap, type)
         │
    taskService.createTask(data)
         │
    taskService.addTask(roadmap, task)
         │
    roadmapService.save(config.path, updatedRoadmap)
         │
    Returns new Task → renderer
         │
    onSuccess → invalidate task list + stats queries
         │
    TanStack Query refetches → UI updates
```

### External Change Flow

```
User runs `prt add "Something" -t feature` in terminal
         │
    PRT writes to prt.json
         │
    RoadmapRepository file watcher detects change
         │
    Main process sends 'prt:file:changed' to renderer
         │
    Renderer receives event → queryClient.invalidateQueries()
         │
    TanStack Query refetches all active queries → UI updates
```

---

## Type System

### Shared Types

PRT's types are used across all three processes. The preload `index.d.ts` file re-exports the relevant types so the renderer gets full type safety without importing PRT directly.

```typescript
// preload/index.d.ts
import type {
  Roadmap,
  Task,
  TaskID,
  Config,
  TASK_TYPE,
  STATUS,
  PRIORITY,
  Tag
} from 'project-roadmap-tracking/dist/util/types.js'

interface PrtAPI {
  // ... (typed API surface as defined in IPC API Design section)
}

declare global {
  interface Window {
    api: PrtAPI
    electron: ElectronAPI
  }
}
```

### PRT Type Reference

```typescript
// Task IDs: template literal types
type TaskID = `${TASK_TYPE_LETTER}-${SingleDigit}${SingleDigit}${SingleDigit}`
// e.g., 'F-001', 'B-003', 'I-012'

// Task types
enum TASK_TYPE {
  Bug,
  Feature,
  Improvement,
  Planning,
  Research
}

// Statuses
enum STATUS {
  NotStarted,
  InProgress,
  Complete
}

// Priorities
enum PRIORITY {
  Low,
  Medium,
  High
}

// Task shape
interface Task {
  id: TaskID
  title: string
  details: string
  type: TASK_TYPE
  status: STATUS
  priority: PRIORITY
  'passes-tests': boolean
  'depends-on': TaskID[]
  blocks: TaskID[]
  tags: Tag[]
  createdAt: string
  updatedAt: string
}
```

---

## Security

### Context Isolation

Context isolation is **enabled** (Electron default). The renderer cannot access Node.js APIs directly. All communication goes through the preload context bridge.

### Content Security Policy

Defined in `renderer/index.html`:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:
```

`'unsafe-inline'` for styles is required by Tailwind CSS. No remote resource loading is permitted.

### Sandbox

The preload script runs with `sandbox: false` to allow PRT type imports in the preload layer. The renderer itself remains fully sandboxed behind the context bridge.

### IPC Surface

The preload exposes only the `PrtAPI` object — a curated set of operations. No raw `ipcRenderer` access is given to the renderer. No arbitrary file system access is exposed.

---

## Testing Strategy

### Vitest + React Testing Library

| Test Type          | Tool                           | Target                                |
| ------------------ | ------------------------------ | ------------------------------------- |
| Component tests    | Vitest + React Testing Library | Renderer components in isolation      |
| Hook tests         | Vitest + `renderHook`          | TanStack Query hooks with mocked IPC  |
| Main process tests | Vitest                         | IPC handlers with mocked PRT services |
| Preload tests      | Vitest                         | Context bridge API shape              |

### Mocking Strategy

The `window.api` object is mocked at the test level, providing a clean boundary between UI tests and PRT integration:

```typescript
// test/mocks/api.ts
export const mockApi: PrtAPI = {
  task: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    passTest: vi.fn(),
    delete: vi.fn()
  },
  project: {
    /* ... */
  },
  deps: {
    /* ... */
  },
  onFileChanged: vi.fn().mockReturnValue(() => {})
}
```

### Test File Convention

```
src/renderer/src/components/__tests__/task-list.test.tsx
src/renderer/src/hooks/__tests__/use-tasks.test.ts
src/main/ipc/__tests__/task.ipc.test.ts
```

---

## Build & Distribution

### electron-builder

Configured in `electron-builder.yml`. Targets:

| Platform | Format              | Notes                           |
| -------- | ------------------- | ------------------------------- |
| macOS    | DMG, ZIP            | Notarization-ready, ARM64 + x64 |
| Windows  | NSIS installer      |                                 |
| Linux    | AppImage, snap, deb |                                 |

### Build Pipeline

```
bun run build
    │
    ├── TypeScript type check (main + renderer)
    │
    ├── electron-vite build
    │   ├── Main → out/main/index.js
    │   ├── Preload → out/preload/index.js
    │   └── Renderer → out/renderer/ (HTML + JS + CSS)
    │
    └── electron-builder (platform-specific)
        └── dist/ (DMG, NSIS, AppImage, etc.)
```

### Peer Dependency: project-roadmap-tracking

PRT is declared as a peer dependency (`^0.2`). It must be installed alongside prt-frontend. In production builds, `electron-builder` bundles it into the app's `node_modules`.

---

**Document Maintainers:** Update this document when making architectural changes.
