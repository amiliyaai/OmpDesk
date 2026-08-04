# Release Process

This document describes how to ship a new OmpDesk version to all three platforms (Windows / macOS / Linux). The pipeline is automated with GitHub Actions: you prepare the version and changelog, push a tag, and the CI builds every platform artifact and publishes the GitHub Release — including the version changelog and the `latest*.yml` metadata consumed by the in-app auto-updater.

## Pipeline overview

```
1. Bump version + update CHANGELOG.md
2. Commit & push tag `vX.Y.Z`
        │
        ▼
GitHub Actions (.github/workflows/release.yml)
 ├─ build-windows → NSIS installer            (windows-latest)
 ├─ build-macos   → universal DMG + zip       (macos-14, arm64+x64)
 ├─ build-linux   → AppImage + deb            (ubuntu-latest)
 └─ release       → GitHub Release            (notes extracted from CHANGELOG.md,
                                               artifacts + latest*.yml uploaded)
        │
        ▼
3. Verify the release
4. Users receive the update via electron-updater (in-app, ~10s after launch)
```

## Before you start

- You have push access to the repository and the working tree is clean.
- The version follows [Semantic Versioning](https://semver.org/).

## Step 1 — Prepare the version

1. **Bump the version** in `package.json` (e.g. `0.1.0` → `0.2.0`).
2. **Update `CHANGELOG.md`**:
   - Rename the `## [Unreleased]` section to `## [X.Y.Z] - yyyy-mm-dd` (keep today's date).
   - Add a fresh empty `## [Unreleased]` section on top.
   - The pipeline **fails** if no matching section exists — the release notes are extracted from this file by `scripts/extract-changelog.mjs`.
3. **Sanity-check locally** (requires `npm ci`):

   ```bash
   npm run typecheck
   npm run smoke        # read-only RPC smoke tests (needs omp installed)
   node scripts/e2e.mjs # optional: real end-to-end against omp
   ```

4. Commit:

   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "release: vX.Y.Z"
   ```

## Step 2 — Tag & publish

```bash
git tag v0.2.0          # tag name MUST be v<semver>, e.g. v0.2.0
git push origin main --tags
```

Pushing the tag triggers the release workflow. Watch it at **Actions → Release** (all three build jobs must be green).

## Step 3 — Verify the release

1. Open **Releases** → the new release:
   - Title `OmpDesk vX.Y.Z`, body contains the changelog section for this version.
   - Artifacts present: `OmpDesk-<version>-win-x64.exe`, `OmpDesk-<version>-mac-universal.dmg` + `.zip`, `OmpDesk-<version>-linux-x64.AppImage` + `.deb`.
   - Update metadata present: `latest.yml` (Windows), `latest-mac.yml`, `latest-linux.yml`.
2. **Smoke-test the auto-update** on at least one platform:
   - Install the previous version, launch it, wait ~10 s (or use tray → *Check for Updates…*).
   - A notification appears when the new version is downloaded; click it (or use the in-app banner → *Restart & Install*) to apply the update.
   - After restart, the About dialog shows the new version.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `release` job failed with "CHANGELOG.md 中未找到版本…" | The tag's CHANGELOG has no `## [X.Y.Z] - yyyy-mm-dd` section. Add it, commit, re-tag, re-push. |
| A build job failed (missing `release/*` artifacts) | Fix the cause, then delete the tag and the release (or bump to a patch version) and re-push the tag. Build jobs are re-run by re-pushing the same tag — the `release` job appends to the existing release. |
| Windows SmartScreen / macOS Gatekeeper warnings | Expected for unsigned builds. Install via *More info → Run anyway* / right-click → Open. See signing notes below. |
| macOS auto-update reports an error | Auto-update on macOS requires a Developer ID-signed build. Unsigned builds still update manually. |

## Notes

- **Signing**: CI builds are unsigned by default (`CSC_IDENTITY_AUTO_DISCOVERY=false` on macOS). To enable signed Windows / macOS builds, configure `CSC_LINK` / `CSC_KEY_PASSWORD` (and `WIN_CSC_LINK`) as repository secrets and drop the env override in the workflow. macOS signing is required for automatic updates on macOS.
- **Universal macOS**: the CI builds one universal (arm64 + x64) package, so `latest-mac.yml` stays a single file. Local `npm run build:mac` builds only the host architecture.
- **Re-running a failed release**: the `release` job is idempotent-ish — artifacts are appended to the existing release; duplicate names are overwritten.
- **Private previews**: use a draft tag (e.g. `v0.2.0-rc.1`) — the workflow releases whatever tag is pushed; mark the release draft manually if you don't want it public.

## Related

- [CHANGELOG.md](CHANGELOG.md) — the version changelog source of truth
- [.github/workflows/release.yml](.github/workflows/release.yml) — the pipeline
- [scripts/extract-changelog.mjs](scripts/extract-changelog.mjs) — changelog → release notes extractor
- [electron-builder.yml](electron-builder.yml) — packaging & publish config
