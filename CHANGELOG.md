# Changelog

All notable changes to OmpDesk are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each release ships to all three platforms (Windows / macOS / Linux) — see [RELEASE_NOTES.md](RELEASE_NOTES.md) for per-release artifact lists and installation notes.

## [Unreleased]

### Added
- Auto-update via electron-updater (GitHub Releases feed): silent background check 10 s after launch, system notification + in-app banner when a new version is downloaded, one-click restart & install, manual check from the tray menu
- About dialog (tray / app menu) and macOS About panel
- GitHub Actions release pipeline: `v*` tag → Windows / macOS (universal) / Linux builds → GitHub Release with notes auto-extracted from `CHANGELOG.md`; artifacts include `latest*.yml` update metadata
- `scripts/extract-changelog.mjs` — changelog section extractor used by the pipeline
- Release process documentation (`RELEASE.md`)

### Changed
- UI fonts: bundle Inter Variable for Latin UI text and JetBrains Mono Variable for monospace (code / logs / tool names), Chinese text falls back to system fonts (PingFang SC / Microsoft YaHei); both via fontsource (OFL)

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
