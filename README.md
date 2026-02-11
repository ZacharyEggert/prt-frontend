# prt-frontend

A desktop GUI for [project-roadmap-tracking](https://github.com/ZacharyEggert/project-roadmap-tracking) (PRT), built with Electron, React, and TypeScript. Provides a visual interface for all PRT task management operations — creating, viewing, updating, completing, and validating project roadmaps — without needing the command line.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop runtime | Electron 39 |
| Build tooling | electron-vite 5, Vite 7 |
| Frontend | React 19, TypeScript 5.9 |
| State management | TanStack Query |
| UI components | shadcn/ui + Tailwind CSS |
| PRT integration | Direct service imports in main process |
| Testing | Vitest + React Testing Library |
| Package manager | Bun |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.0.0
- [Bun](https://bun.sh/) >= 1.0
- [project-roadmap-tracking](https://www.npmjs.com/package/project-roadmap-tracking) ^0.2 (peer dependency)

## Getting Started

### Install

```bash
bun install
```

### Development

```bash
bun run dev
```

This starts electron-vite in development mode with hot module replacement for the renderer process.

### Build

```bash
# macOS
bun run build:mac

# Windows
bun run build:win

# Linux
bun run build:linux
```

## Project Structure

```
src/
├── main/                  # Electron main process
│   └── index.ts           # Window creation, IPC handlers, PRT service integration
├── preload/               # Context bridge (main ↔ renderer)
│   ├── index.ts           # Exposes typed IPC API to renderer
│   └── index.d.ts         # Type definitions for exposed API
└── renderer/              # React frontend
    ├── index.html         # HTML entry point
    └── src/
        ├── main.tsx       # React root
        ├── App.tsx        # Root component
        ├── assets/        # CSS, images, SVGs
        └── components/    # React components
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architectural documentation.

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start in development mode with HMR |
| `bun run build` | Typecheck and build for production |
| `bun run start` | Preview the production build |
| `bun run typecheck` | Run TypeScript type checking (main + renderer) |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |
| `bun run build:mac` | Build macOS distributable (DMG, ZIP) |
| `bun run build:win` | Build Windows distributable (NSIS) |
| `bun run build:linux` | Build Linux distributable (AppImage, snap, deb) |

## IDE Setup

- [VS Code](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- Debug configurations for main and renderer processes are included in `.vscode/launch.json`

## License

MIT
