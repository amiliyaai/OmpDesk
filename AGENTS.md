# AGENTS.md — OmpDesk 开发与发布规范

OmpDesk: oh-my-pi (omp) 的桌面 GUI 客户端(Electron 43 + React 19 + TypeScript, 三平台 Windows/macOS/Linux)。
完整项目信息见 README.md(中英双语), 发布全流程见 RELEASE.md。

## 发布规则(重要)

**版本发布必须带 tag; 小更新禁止带 tag。**

- **版本发布**(新版本号 / 用户可见的新功能或里程碑):
  1. bump `package.json` 的 `version`
  2. 在 `CHANGELOG.md` 登记 `## [X.Y.Z] - yyyy-mm-dd` 条目(Keep a Changelog 格式), 并将已完成内容移出 `[Unreleased]`
  3. 提交后打 tag:`git tag vX.Y.Z`(必须 `v` + semver, 如 `v0.2.0`)
  4. 推送:`git push origin main --tags`
     → 推送 tag 触发 GitHub Actions(`.github/workflows/release.yml`)自动构建三端产物并发布 GitHub Release, notes 从 CHANGELOG 提取
- **小更新**(bug 修复 / 小改动 / 非发布级变更):
  - 正常 commit + push, **不要打 tag**
  - 值得记录的内容写入 CHANGELOG.md 的 `[Unreleased]` 区块, 随下次发版一并发布

## 发版前检查清单

- [ ] `package.json` version 与 tag 一致
- [ ] `CHANGELOG.md` 存在 `## [X.Y.Z] - yyyy-mm-dd` 条目(缺失则 CI 的 release job 直接失败)
- [ ] `npm run typecheck` 通过
- [ ] 改过打包配置时 `npm run pack:dir` 快速验证
- [ ] tag 推送后到 Actions → Release 确认三端 job 全绿、Release 页面产物齐全(latest*.yml + 安装包)

## 禁止事项

- 不打 tag 就推送版本(或打 tag 而不登记 CHANGELOG)→ extract-changelog 报错, release job 失败
- 小更新打 tag → 误触发三端构建发布
- 直接修改/提交构建产物(`out/`、`release/`、`*.tsbuildinfo`, 均已 gitignore)

## 常用命令

```bash
npm run dev            # 开发模式(HMR)
npm run typecheck      # 主进程 + 渲染进程类型检查
npm run smoke          # 协议层冒烟(只读 RPC, 不消耗 API)
npm run build:win|mac|linux   # 全量打包(前端构建 + electron-builder)
npm run pack:win       # 仅打包(前端已构建时迭代用, 快数倍)
node scripts/extract-changelog.mjs <version>   # 提取 changelog 条目(CI 发布用)
```

## 语言约定

- commit message 用中文(参照历史提交风格: `类型: 改动内容; 验证结果`)
- 对外文档: README 中英双语, 其余(RELEASE/CHANGELOG 等)默认英文
