# I-003 Accessibility Audit

Date: 2026-02-16  
Scope: Renderer-wide audit (`welcome`, `dashboard`, `tasks`, shared navigation, dialogs/sheet, dependency graph, validation panel)

## Interactive Element Inventory

### `src/renderer/src/pages/welcome.tsx`

- `Browse for Project` button
- `Choose Directory` button
- New project form fields (`Project Name`, `Description`, `Include sample tasks`)
- `Create Project` and `Cancel` buttons

### `src/renderer/src/pages/dashboard.tsx`

- Quick action buttons (`Add Task`, `View Tasks`, `Validate`)
- Dependency graph interaction surface (via `DependencyGraph`)
- Validation panel task links (via `ValidationPanel`)

### `src/renderer/src/pages/tasks.tsx`

- `Add Task` button
- Search input
- Filter controls (status toggles, type/priority menus, active filter chips)
- Task list rows and sortable headers
- Create dialog, detail sheet, dependency dialogs, confirmation dialogs

### `src/renderer/src/components/layout.tsx`

- Sidebar navigation buttons (`Welcome`, `Dashboard`, `Tasks`)
- Theme toggle radios

### `src/renderer/src/components/dependency-graph.tsx` and `.../node.tsx`

- Keyboard-focusable graph nodes (Enter/Space activation)
- Zoom controls

### `src/renderer/src/components/validation-panel.tsx`

- Task ID link-style buttons inside grouped validation errors

## Before -> After Issues

1. Sortable headers used click handlers on `<th>` without semantic controls.

- Fixed by rendering real `<button type="button">` controls and setting `aria-sort`.

2. Task rows were mouse-clickable only.

- Fixed by adding roving row focus (`tabIndex`), keyboard navigation (`ArrowUp`, `ArrowDown`, `Home`, `End`), and keyboard activation (`Enter`, `Space`).

3. Create dialog and task detail sheet did not guarantee focus return to invoking controls.

- Fixed by storing focus origin and restoring focus on close (with row/trigger fallback).

4. Icon-only remove controls were not explicitly labeled and were hidden on hover-only interaction.

- Fixed by adding descriptive `aria-label` values and keyboard-visible reveal states (`group-focus-within`, `focus-visible`).

5. Search inputs relied on placeholder text for discoverability.

- Fixed by adding explicit accessible labels.

6. Renderer-wide consistency issues (`button` semantics and announced purpose).

- Fixed by adding explicit `type="button"` where relevant and improving spoken labels (for graph nodes and filter chip controls).

## Keyboard Checklist (Implemented and Verified in Automated Tests)

- [x] Sort controls are focusable and activatable with keyboard.
- [x] Sort state is exposed with `aria-sort`.
- [x] Task list supports row focus navigation with arrow keys + Home/End.
- [x] Task rows activate with Enter/Space.
- [x] Create task dialog closes with Escape and returns focus to trigger.
- [x] Task detail sheet closes with Escape and returns focus to originating row.
- [x] Active filter remove controls are keyboard operable.
- [x] Search clear control is keyboard operable.
- [x] Dashboard and Welcome primary actions are discoverable by role/name and keyboard operable.

## VoiceOver Checklist (Manual)

Environment requirement: macOS with VoiceOver enabled.  
CLI execution cannot drive native VoiceOver, so manual verification must be run in-app.

- [ ] Sidebar navigation announces current page and button names clearly.
- [ ] Tasks list rows announce actionable purpose and task identifiers.
- [ ] Sort headers announce as sortable controls and current sort state.
- [ ] Create dialog and task detail sheet announce titles/descriptions and trap focus.
- [ ] Filter chip remove controls announce exact action target.
- [ ] Dependency remove icon controls announce exact relationship being removed.
- [ ] Welcome and Dashboard primary actions announce clear intent.

Manual VoiceOver result status: **Pending local GUI verification**.
