# Repository Guidelines

## Project Structure & Module Organization
- `library.json` — H5P metadata and preload list (points to `dist/`).
- `semantics.json` — editor schema for fields in the H5P authoring tool.
- `src/` — React UI and H5P entry (`index.jsx`, `ui/`, `util/`).
- `dist/` — webpack build output (`murder-mystery.bundle.js`).
- `styles/` — CSS scoped to `.h5p-mm` (`murder-mystery.css`).
- `README.md` — short usage and build notes.

## Build, Test, and Development Commands
- Install: `npm install`
- Build: `npm run build` → emits `dist/murder-mystery.bundle.js` (referenced in `library.json`).
- Dev watch: `npm run dev` (rebuilds on change; copy updated `dist/` to your H5P host if needed).
- Local development (H5P platform): copy this folder to your platform’s libraries path, e.g. `sites/default/files/h5p/libraries/H5P.MurderMysteryProto-0.1/`, then clear caches and create new content using the library.

## Coding Style & Naming Conventions
- Indentation: 2 spaces for JSON; 2 spaces for JS/JSX.
- React: function components with hooks; keep H5P entry in `src/index.jsx` exporting `H5P.MurderMysteryProto`.
- JavaScript/JSX: semicolons, single quotes, camelCase for variables/methods.
- CSS: prefix selectors with `.h5p-mm` and BEM-like blocks/elements (e.g., `.h5p-mm__person`).
- Filenames: kebab-case; React components in `src/ui/` use `PascalCase.jsx` if you add more.

## Testing Guidelines
- Framework: none yet; rely on manual testing in the H5P editor and player.
- Manual checklist: bundle loads, chat sends and replies, no console errors, styles scoped to `.h5p-mm`, semantics fields appear and save.
- Backward compatibility: do not remove or rename existing `semantics.json` fields without a version bump and migration plan.

## Commit & Pull Request Guidelines
- History shows no strict convention. Use Conventional Commits going forward: `feat:`, `fix:`, `chore:`, `docs:`.
- Include: brief description, rationale, screenshots/GIFs for UI changes.
- Versioning: bump `library.json` versions when changing behavior, assets, or semantics; update dependencies if paths change.

## Agent-Specific Notes (H5P)
- Keep `machineName` as `H5P.MurderMysteryProto` and folder name `H5P.MurderMysteryProto-0.1` unless performing a formal version upgrade.
- `library.json` now preloads `dist/murder-mystery.bundle.js` and `styles/murder-mystery.css`.
- Prototype-only: OpenAI key is injected at build time via `.env`; never ship this to production.
