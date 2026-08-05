# Changelog

All notable changes to OmpDesk are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each release ships to all three platforms (Windows / macOS / Linux) — see [RELEASE_NOTES.md](RELEASE_NOTES.md) for per-release artifact lists and installation notes.

## [Unreleased]

### Added
- **Sidebar project grouping with expand/collapse**: group headers now show the project name (directory basename, full path on tooltip, path fallback when names collide) plus a session-count badge, and click to collapse/expand — collapse state persists in `localStorage` and is auto-overridden (expanded) while searching
- **Integrations discovery aligned with oh-my-pi v17** (previously MCP servers and skills from other tools were invisible):
  - MCP servers are now also discovered from imported sources, in omp's precedence order (first match wins): Claude Code (`~/.claude.json` user-level + `projects[<ws>]`, `~/.claude/mcp.json`), Codex (`config.toml` `[mcp_servers.*]` via a new minimal TOML parser in `electron/main/omp/toml.ts`), Cursor, VS Code (`servers` key), OpenCode, Windsurf, Gemini CLI, plus the root `mcp.json` fallback — all read-only; editing/toggling still writes `~/.omp/agent/mcp.json`
  - Skills are now discovered from the full provider set (`~/.agents/skills`, `~/.agent/skills`, `~/.claude/skills`, `~/.codex/skills`, `~/.config/opencode/skills`, project `.agents/.claude/.codex/.github/skills`, managed last), with per-item source labels (`omp` / `claude` / `agents` / `codex` / …) and localized scope tags (user / project / managed)
- TOML parser unit test (`scripts/verify-toml.ts`, run with `npx tsx scripts/verify-toml.ts`)

## [0.5.0] - 2026-08-05

### Added
- **History session token aggregation**: `aggregateUsage()` stream-scans all session JSONL files (readline, only message `usage` records — no display-structure build), shown in *Settings → Usage* as an all-time total card plus a per-workspace breakdown (sessions / input / output tokens); clicking a workspace row opens a new session there; `newSession` now accepts an explicit workspace
- **Worktree parallel workspaces**: new `electron/main/omp/worktree.ts` wraps `git worktree list/add/remove` (porcelain parsing, branch-name validation to prevent injection, path removal restricted to known non-main worktrees, no `--force` so uncommitted changes surface as errors)
  - File menu → *New Worktree Chat* (`Ctrl+Shift+N`): creates a worktree with an auto-generated branch and opens a session inside it
  - Settings → Data worktree panel: git-repo detection for the default workspace, worktree list (main marker / branch / path), create with optional branch name, open session here, remove (with confirm)
  - Worktree sessions appear as their own sidebar group automatically (distinct `cwd`)
- Code review hardening for v0.4.0 (commit `d46aec6`): backend-switch ordering (re-locate before rebuilding the pool), approval-mode dropdown now writes `config.yml` and restarts the pool, file-tree collapse hides whole subtrees, 15+ main-process error strings localized, skills/mcp project paths follow the active backend, native-menu accelerators for `Ctrl+Shift+E` / `F11`, `sendPrompt` targets the session's own workspace, en/ja dictionaries compile-time shape-checked (`satisfies DictShape`), `readFile` realpath guard against symlink escapes

### Fixed
- Backend switch used the old binary to rebuild the process pool (ordering bug)
- Approval-mode dropdown showed a fake "restarted" notice without writing `config.yml`
- File tree collapse left child directories visible ("empty-dir bleed-through")
- Messages could be sent to the wrong workspace process when a history session from another workspace was open
- Worktree test branch cleanup verified locally (create → list → remove → clean)

## [0.4.0] - 2026-08-05

### Added
- **i18n (multi-language)**: lightweight zero-dependency i18n layer with `zh-CN` / `en` / `ja` dictionaries, type-safe keys and `{param}` interpolation; switch language in *Settings → General* (persisted); every user-visible string extracted (~260 across renderer and main process — UI, tray, notifications, updater dialogs, about)
- **Application menu bar (Codex-style)**: File / Edit / View / Help — self-drawn in the renderer on Windows/Linux, native app menu on macOS; accelerators registered on all platforms (Ctrl+N new chat, Ctrl+O open folder, Ctrl+, settings, Ctrl+Shift+E file panel, F11 fullscreen, zoom); Edit roles (undo/redo/cut/copy/paste/select-all)
- **Settings restructure (Codex-style grouped navigation)**: three groups (Personal / Agent / System) with eight pages — General / Appearance / Model Service / Integrations / Data / Usage / Backend / About; About shows the dynamic app version
- **File panel**: session files (extracted from tool calls in history + live streaming) and workspace file tree (skips `node_modules`/`.git`, depth & entry limits) with multi-tab read-only syntax-highlighted preview and drag-to-resize; new read-only IPC `omp:listFiles` / `omp:readFile` (path-traversal guarded, 512 KB cap)
- **Process transparency (token dimension)**: per-session token chip in the top bar (Σ input/output), process summary row (messages · tool calls · total tokens) under the message stream, exact token counts on message cards
- **Dual backend (BackendAdapter)**: omp (oh-my-pi) and pi (earendil-works) share the same origin — backend switch in *Settings → Backend* (auto / omp / pi) re-locates the binary and rebuilds the process pool; differences (binary name, data dir `~/.omp/agent` vs `~/.pi/agent`, `--mode rpc-ui` vs `--mode rpc`, `abort_and_prompt` split, protocol v2 negotiation) are centralized in `electron/main/omp/backend.ts`
- Auto-update via electron-updater (GitHub Releases feed): silent background check 10 s after launch, system notification + in-app banner when a new version is downloaded, one-click restart & install, manual check from the tray menu
- About dialog (tray / app menu) and macOS About panel
- GitHub Actions release pipeline: `v*` tag → Windows / macOS (universal) / Linux builds → GitHub Release with notes auto-extracted from `CHANGELOG.md`; artifacts include `latest*.yml` update metadata
- `scripts/extract-changelog.mjs` — changelog section extractor used by the pipeline
- Release process documentation (`RELEASE.md`)

### Changed
- Settings tabs consolidated: Model Service (unchanged) and Integrations (MCP + Skills merged); Usage and Backend pages added
- Message token display now shows exact counts instead of rounded `k` values
- UI fonts: bundle Inter Variable for Latin UI text and JetBrains Mono Variable for monospace (code / logs / tool names), Chinese text falls back to system fonts (PingFang SC / Microsoft YaHei); both via fontsource (OFL)
- E2E settings suite updated for the grouped navigation (MCP/Skills now under Integrations)

### Fixed
- CI builds now pass `--publish never`: electron-builder auto-publishes on git tags (publish config present) and failed without `GH_TOKEN` in the build jobs — publishing is done exclusively by the release job
- deb packaging requires an author email — added to `package.json`
- Release job uploads files only (`find -type f`, excluding `builder-debug.yml`): artifacts contained `*-unpacked` directories that `gh release create` rejects

## [0.1.0] - 2026-08-05

Initial release. OmpDesk connects to a real `omp` agent process over its RPC interface and provides a full desktop chat experience.

### Added

- **omp RPC protocol layer**
  - NDJSON framing with v2 transport negotiation and `rpc_chunk` large-frame reassembly
  - Command/response correlation and event dispatch with timeout fallback for UI requests
  - Per-workspace process pool: LRU eviction, idle reclamation, restart on config change, bounded process count
  - Cross-platform `omp` binary discovery (`PATH` → common per-platform install locations)
  - Session scanning (light head/tail file reads), JSONL v3 parsing, delete (incl. child sessions), HTML export
  - `config.yml` / `models.yml` read-write with pre-write `*.bak` backups and atomic writes
  - CC-Switch-style config profiles with `safeStorage`-encrypted API keys
  - `mcp.json` merge across user / project / compatible sources; SKILL.md discovery and enable/disable

- **Core UI**
  - Chat view with virtual scrolling (renders only the visible window, measured heights)
  - Message bubbles with markdown rendering (sanitized), code highlighting + copy
  - Collapsible thinking blocks; tool-call cards (queued / running / success / failed, args + results)
  - Ask approval cards (confirm / select / input / editor) with timeout fallback
  - Composer with interrupt / continue and image paste to send
  - Session sidebar (search / pin / workspace grouping / rename / delete), empty state
  - Todo panel with real-time tracking; explicit compaction progress
  - Model picker with runtime `set_model` hot-switch
  - Settings modal (Model Service / MCP / Skills / Appearance / Data)
  - Command palette (`Ctrl+K`), tray, global hotkey (default `Ctrl+Shift+Space`), completion notifications
  - Placeholder app icon (script-generated via `scripts/gen-icon.mjs`)

- **Session resume**
  - Instant local history rendering from JSONL with background `switch_session`
  - Follow-up messages continue the same agent session

- **Packaging & tooling**
  - electron-builder config for Windows (NSIS), macOS (DMG), Linux (AppImage + deb)
  - Protocol smoke tests (read-only RPC, no API cost); UI request-pipeline verification
  - E2E suites: real-prompt streaming + tool calls, session resume, settings, large-session performance

### Fixed

- Virtual-scroll container conditional rendering dropping scroll listeners / size observation (stacked rows)
- Message offsets moved to render-time computation with rAF-throttled measurement
- `get_available_models` timeout raised to 60 s for cold starts; model dropdown lazy-loaded

---

Changelog entries per release: keep this file updated whenever a version is tagged — it is the source for the "Changelog" section of the corresponding [release notes](RELEASE_NOTES.md).
