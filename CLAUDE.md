# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron desktop GUI for the `project-roadmap-tracking` (PRT) CLI tool. Built with Electron 39 + React 19 + TypeScript 5.9, using Bun as the package manager.

## Development Commands

```bash
# Development
bun run dev              # Start development with HMR
bun run build            # Typecheck and build for production
bun run start            # Preview production build

# Code Quality
bun run typecheck        # Type check all (main + renderer)
bun run typecheck:node   # Type check main/preload only
bun run typecheck:web    # Type check renderer only
bun run lint             # ESLint with cache
bun run format           # Prettier formatting

# Testing
bun run test                      # Run all tests (watch mode)
bun run test -- --run             # Run tests once
bun run test tests/backend/       # Backend tests only (main/preload)
bun run test tests/frontend/      # Frontend tests only (React)
bun run test path/to/file.test.ts # Single test file

# Distribution
bun run build:mac        # Build macOS app
bun run build:win        # Build Windows app
bun run build:linux      # Build Linux app
```

## Code Style

- **Prettier**: Single quotes, no semicolons, 100 char width (see [.prettierrc.yaml](.prettierrc.yaml))
- **ESLint**: `@electron-toolkit/eslint-config-ts` with React hooks (see [eslint.config.mjs](eslint.config.mjs))
- **Path alias**: `@renderer/*` → `./src/renderer/src/*`

## Architecture Overview

Three-process Electron architecture:

```
Main Process (Node.js)     ←→  Preload (Context Bridge)  ←→  Renderer (React)
src/main/                                 src/preload/            src/renderer/src/
- IPC handlers                            - window.api bridge     - React UI
- PRT service imports                     - Type definitions      - TanStack Query
- File system access                      - Security boundary     - shadcn/ui + Tailwind
```

**Key Principles:**

- **IPC channels** use convention: `prt:{domain}:{action}` (e.g., `prt:project:open`)
- **PRT is the single source of truth** - all data persists in `prt.json` files managed by PRT services
- **Main process** directly imports PRT services from `project-roadmap-tracking/dist/`
- **State management** with TanStack Query for async IPC calls and caching
- **Security**: Context isolation enabled, preload exposes curated API only

See [ARCHITECTURE.md](ARCHITECTURE.md) for comprehensive details.

## Project Structure

```
src/
├── main/
│   ├── index.ts          # Electron app lifecycle, window management
│   └── ipc/              # IPC handlers (project.ipc.ts, etc.)
│       └── utils.ts      # wrapHandler() for error serialization
├── preload/
│   ├── index.ts          # Context bridge setup
│   └── index.d.ts        # TypeScript definitions for window.api
└── renderer/
    └── src/
        ├── main.tsx      # React root
        ├── App.tsx       # App shell
        ├── components/   # React components
        └── lib/          # Utilities

tests/
├── backend/              # Main/preload tests (node environment)
│   └── setup.ts
└── frontend/             # React component tests (jsdom environment)
    └── setup.ts
```

## Adding IPC Handlers

This is the most common extension point. Follow this pattern:

1. **Create handler** in `src/main/ipc/{domain}.ipc.ts`:

   ```typescript
   import { ipcMain } from 'electron'
   import { wrapHandler } from './utils'
   import { SomeService } from 'project-roadmap-tracking/dist/...'

   export function register{Domain}Handlers() {
     ipcMain.handle('prt:{domain}:{action}', wrapHandler(async (event, ...args) => {
       // Use PRT services directly
       return await SomeService.doSomething(args)
     }))
   }
   ```

2. **Register** in `src/main/index.ts`:

   ```typescript
   import { register{Domain}Handlers } from './ipc/{domain}.ipc'
   register{Domain}Handlers()
   ```

3. **Expose in preload** at `src/preload/index.ts`:

   ```typescript
   {domain}: {
     {action}: (...args) => ipcRenderer.invoke('prt:{domain}:{action}', ...args)
   }
   ```

4. **Add types** in `src/preload/index.d.ts`:
   ```typescript
   {domain}: {
     {action}: (...args: ArgTypes) => Promise<ReturnType>
   }
   ```

See [src/main/ipc/project.ipc.ts](src/main/ipc/project.ipc.ts) for a complete example.

## Testing

Two separate Vitest projects:

- **Backend** (`tests/backend/`): Tests main process and IPC handlers (node env)
- **Frontend** (`tests/frontend/`): Tests React components with Testing Library (jsdom env)

Each has its own `setup.ts` file for environment configuration.

## TypeScript Configuration

- **`tsconfig.node.json`**: Main process + preload (Node.js APIs)
- **`tsconfig.web.json`**: Renderer process (DOM APIs, React)
- **`tsconfig.test.json`**: Test files

PRT types flow: `project-roadmap-tracking/dist` → `src/preload/index.d.ts` → renderer autocomplete via `Window` interface.

## Key Dependencies

- **`project-roadmap-tracking`** (peer dependency ^0.2) - Core PRT services
- **TanStack Query** - Async state management for IPC
- **shadcn/ui** - Component library (copied in, not linked)
- **Tailwind CSS 4** - Styling
- **lucide-react** - Icons

## Further Reading

- [ARCHITECTURE.md](ARCHITECTURE.md) - Comprehensive architectural documentation
- [README.md](README.md) - Project setup and quick start

## Task management

Tasks are tracked using the project-roadmap-tracking tool itself. To view and manage tasks, run the CLI tool in your terminal:

```bash
prt <command> [options]
```

### Common commands:

- `prt list` - List all tasks
  - `prt list -i` - List incomplete tasks only
- `prt add "Task title" -d "Detailed task description" -t [feature|bug|improvement|planning|research]` - Add a new task
- `prt complete <task-id> [-t]` - Mark a task as complete (with optional passes-test flag)
- `prt show <task-id> [-d]` - Show detailed information about a specific task (with optional dependency details)

Refer to the [project-roadmap-tracking documentation](https://github.com/ZacharyEggert/project-roadmap-tracking) for detailed usage instructions.

For large projects, use a pipe to head to avoid overwhelming output. Assume this is necessary unless the user specifies show every task or every incomplete task:

```bash
prt list [-i] | head -n 20
```

This will show the first 20 lines, which is usually sufficient for an overview without flooding the terminal. The output will be truncated, but that is good.

### User Interfacing

**When** the user asks to complete a task, look up the task by the given id. Look at the task's description and title to understand what the task is about. Create a plan to complete the task, and then execute that plan. If the task is complex, break it down into smaller steps and complete those steps one by one. After completing the task, mark it as complete using the CLI command. Do not mark the task as complete until you have fully completed it and are confident that it meets the requirements. Do not mark the task as complete until the project compiles and all tests pass. The following commands should be used to verify that the task is complete before marking it as complete:

```bash
bun run typecheck
bun run lint
bun run format
bun run test
bun run build
```

run these commands sequentially and ensure that each command completes successfully before moving on to the next one. If any of these commands fail, investigate the issue and fix it before proceeding. Only after all commands have completed successfully should you mark the task as complete.

**When** the user asks to show a task, look up the task by the given id and display its details. If the user requests dependency details, also show any tasks that are dependencies of this task.

**When** the user asks to show the next task, run `prt list -i | head -n 20` to get the first 20 lines of the incomplete tasks. Grab the first task id from that list and show the details of that task with `prt show <task-id> -d`. This will give the user an overview of the next task they should work on, along with its dependencies.

**When** the user asks to add a task, create a new task with the given title, description, and type. Assign it a unique id and add it to the list of tasks. If you are unsure of any of the details, ask the user for clarification before creating the task.
