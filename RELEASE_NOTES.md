# OmpDesk v0.1.0 — Release Notes

**2026-08-05** · Initial release · Windows / macOS / Linux

> **About this file:** release notes are now generated automatically — the CI pipeline ([RELEASE.md](RELEASE.md)) extracts the matching section from [CHANGELOG.md](CHANGELOG.md) for every `v*` tag. This file is kept as the v0.1.0 release announcement and as a template for future hand-written notes.

OmpDesk is a desktop GUI client for the [oh-my-pi (omp)](https://omp.sh/) terminal AI coding agent — a Claude-Desktop-style home that drives the **real** `omp` process over its RPC interface (`omp --mode rpc-ui`). No mocks, no data duplication, no lock-in: sessions, models, MCP servers and Skills all live in omp's own storage.

## Highlights

- **Real agent chat** — streaming output (rAF-batched), collapsible thinking blocks, tool-call cards with full lifecycle (queued / running / success / failed, args + results), and ask approval dialogs (confirm / select / input / editor) with timeout fallback.
- **Session management** — history list with search / pin / workspace grouping, instant local JSONL rendering, one-click resume & follow-up in the same session, delete (incl. child sessions), HTML export, rename.
- **Models & config profiles** — runtime `set_model` hot-switch, lazy-loaded model list; named profiles (provider + API key + role mapping + approval mode) applied in one click, `safeStorage`-encrypted keys, pre-write `*.bak` backups.
- **MCP & Skills** — stdio / HTTP / SSE server CRUD with enable-disable switches; SKILL.md discovery and enable/disable.
- **System integration** — tray residency, global hotkey (`Ctrl+Shift+Space`), completion notifications, `Ctrl+K` command palette, five-group settings (Model Service / MCP / Skills / Appearance / Data).
- **Performance** — virtual-scrolled message stream with measured heights, incremental rendering, bounded per-workspace process pool (LRU + idle reclamation).

## Prerequisites

- [oh-my-pi (omp)](https://omp.sh/) **must be installed** (detected via `PATH`, then common per-platform locations — viewable in *Settings → Data*).
- A configured `omp` API key (see the omp documentation) for the first run.

## Downloads

| Platform | Architecture | Artifact |
| --- | --- | --- |
| Windows | x64 | `OmpDesk-0.1.0-win-x64.exe` (NSIS installer) |
| macOS | universal (Apple Silicon + Intel) | `OmpDesk-0.1.0-mac-universal.dmg` (+ `.zip` for auto-update) |
| Linux | x64 | `OmpDesk-0.1.0-linux-x86_64.AppImage` |
| Linux | x64 | `OmpDesk-0.1.0-linux-amd64.deb` |

Artifacts are named `OmpDesk-<version>-<platform>-<arch>.<ext>` per the electron-builder config. Verify integrity against the checksums attached to this release.

## Installation

**Windows**

Run `OmpDesk-0.1.0-win-x64.exe` → choose the install directory (optional) → launch from the desktop shortcut or Start Menu.

**macOS**

1. Open `OmpDesk-0.1.0-mac-universal.dmg` and drag OmpDesk into Applications.
2. First launch (unsigned build): right-click the app → **Open** → **Open** to bypass Gatekeeper.

**Linux**

```bash
# AppImage (make executable first)
chmod +x OmpDesk-0.1.0-linux-x86_64.AppImage
./OmpDesk-0.1.0-linux-x86_64.AppImage

# or Debian / Ubuntu via deb
sudo apt install ./OmpDesk-0.1.0-linux-amd64.deb
```

## What's new in 0.1.0

- Full omp RPC protocol layer: NDJSON framing, v2 transport negotiation, `rpc_chunk` reassembly, per-workspace process pool, cross-platform binary discovery
- Complete chat experience with tool cards, thinking blocks, ask dialogs, interrupt/continue
- Session history, instant local parse, resume & follow-up, export, rename, delete
- Model picker, config profiles (encrypted keys + backups), MCP and Skills management
- Tray, global hotkey, notifications, command palette, five-group settings
- Virtual-scrolled message stream and other performance work
- E2E suites verified against the real `omp` binary (streaming, tools, resume, settings, perf)

Full details: [CHANGELOG.md](CHANGELOG.md) · [README.md](README.md)

## Known limitations

- macOS / Linux packages are built on their own platforms (code is platform-agnostic; verified on Windows).
- MCP runtime connection state (v1) reflects configured state only; restart the session to apply changes.
- Approvals always defer to omp's `tools.approval.*` rules (e.g. `bash: allow` skips the dialog).
- The app icon is a script-generated placeholder (official icon set planned).

## Feedback

Report issues with version, platform, and `omp --version` output. OmpDesk is MIT-licensed; it is not affiliated with or endorsed by the omp project.
