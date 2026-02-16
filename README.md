# prt-frontend

`prt-frontend` is a desktop GUI for
[project-roadmap-tracking](https://github.com/ZacharyEggert/project-roadmap-tracking) (PRT).
It lets you manage `prt.json` roadmaps visually with Dashboard and Tasks views instead of using
only the CLI.

## Install (Prebuilt App)

Download the latest release from:

- <https://github.com/ZacharyEggert/prt-frontend/releases/latest>

Choose your platform artifact:

- macOS: `prt-frontend-<version>.dmg`
- Windows: `prt-frontend-<version>-setup.exe`
- Linux: `prt-frontend-<version>.AppImage`

### macOS install

1. Open the `.dmg`.
2. Drag `prt-frontend.app` to `/Applications`.

### Windows install

1. Run `prt-frontend-<version>-setup.exe`.
2. Complete the NSIS installer flow.

### Linux install

1. Download `prt-frontend-<version>.AppImage`.
2. Mark executable and run:

```bash
chmod +x ./prt-frontend-<version>.AppImage
./prt-frontend-<version>.AppImage
```

## macOS Unsigned App Note (Important)

macOS builds are currently **unsigned and not notarized** (`mac.identity: null`, `notarize: false`).
If macOS quarantines the app after download, run:

```bash
xattr -dr com.apple.quarantine "/Applications/prt-frontend.app"
open "/Applications/prt-frontend.app"
```

If launch is still blocked:

1. Right-click `prt-frontend.app` in Finder and click `Open`.
2. Or go to `System Settings -> Privacy & Security` and click `Open Anyway`.

## Build Locally (macOS Alternative)

If you prefer a local build instead of opening a downloaded unsigned package:

```bash
bun install
bun run build:mac
open dist/mac*/prt-frontend.app
```

## Usage

1. Launch the app.
2. On the Welcome view, choose:
   - `Open Project` to open an existing project directory containing `prt.json`.
   - `Create New Project` to initialize a new roadmap in a chosen directory.
3. Use `Dashboard` for:
   - project metadata and progress
   - roadmap statistics
   - validation results
   - dependency graph visualization
4. Use `Tasks` for:
   - create/edit/delete tasks
   - complete tasks and mark `passes-tests`
   - filter, search, and sort task lists
   - add/remove dependencies between tasks
5. Save from the app menu: `File -> Save` (`Cmd/Ctrl+S`).

When `prt.json` changes externally (for example from CLI usage), the app watches the file and
refreshes cached data.

## Operational Note About `prt` CLI

Creating a new project from the GUI calls `prt init` from the main process (shell execution).
That means the `prt` command must be available on `PATH`.

- Creating projects in-app: requires `prt` CLI on `PATH`
- Opening/managing an existing `prt.json`: does not require running CLI commands manually

Install PRT CLI from:

- <https://www.npmjs.com/package/project-roadmap-tracking>

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) >= 1.0
- `project-roadmap-tracking` available (peer dependency `^0.2`)

### Local dev

```bash
bun install
bun run dev
```

### Scripts

| Script                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `bun run dev`         | Start development mode with HMR                |
| `bun run build`       | Typecheck and build production output          |
| `bun run start`       | Preview production build                       |
| `bun run typecheck`   | Typecheck main + preload + renderer            |
| `bun run typecheck:node` | Typecheck main + preload only               |
| `bun run typecheck:web`  | Typecheck renderer only                     |
| `bun run lint`        | Run ESLint                                     |
| `bun run format`      | Run Prettier                                   |
| `bun run test`        | Run Vitest                                     |
| `bun run build:mac`   | Build macOS artifacts via electron-builder     |
| `bun run build:win`   | Build Windows NSIS installer                   |
| `bun run build:linux` | Build Linux artifacts (AppImage/snap/deb)      |

## Architecture

For architecture and IPC API details, see [ARCHITECTURE.md](ARCHITECTURE.md).

## License

MIT
