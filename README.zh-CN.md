# OmpDesk

**oh-my-pi (omp) 的桌面 GUI 客户端 —— 给终端 AI 编程助手一个 Claude Desktop 式的家。**

![Electron](https://img.shields.io/badge/Electron-43-blue) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-7-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

OmpDesk 通过 RPC 接口(`omp --mode rpc-ui`)驱动真实的 omp CLI —— 非模拟数据、非套壳 GUI。把终端里的编程智能体变成一等桌面应用:流式聊天(thinking 折叠块、工具调用卡片)、会话历史与恢复、模型与配置方案、MCP 与 Skills 管理、托盘常驻与全局快捷键。

> **文档:** [English](README.md) · [Changelog](CHANGELOG.md) · [Release Process](RELEASE.md)

---

## 特性

- **真实驱动 omp**:通过 `omp --mode rpc-ui` 长驻子进程(按工作目录池化,LRU 淘汰 + 空闲回收),所见即智能体的真实输出
- **聊天体验**:流式输出(rAF 合帧增量渲染)、thinking 折叠块、工具调用卡片(排队/运行中/成功/失败,含参数与结果)、ask 审批对话框(confirm/select/input/editor)、打断/继续、代码高亮 + 复制、图片粘贴发送
- **会话管理**:历史列表(搜索/固定/按工作区分组)、本地 JSONL 即时解析展示、`switch_session` 恢复续聊、删除(含子会话)、导出 HTML、重命名
- **模型与配置方案(CC Switch 式)**:运行时 `set_model` 快切;多套命名方案(供应商 + API Key + 模型角色映射 + 审批模式)一键应用,写前自动备份,safeStorage 加密存储 Key
- **MCP 管理**:增删改查 stdio/http/sse 服务器、启停开关、兼容 Claude/Codex 配置源只读展示
- **Skills 管理**:发现 `SKILL.md`、启停(写入 `skills.ignoredSkills`)
- **任务面板**:todo 实时跟随;会话压缩(compact)进度显性化
- **系统集成**:托盘常驻 + 全局快捷键唤起(默认 `Ctrl+Shift+Space`)、会话完成系统通知、`Ctrl+K` 命令面板
- **设置五组**:模型服务 / MCP / Skills / 外观 / 数据,单一入口
- **三平台**:Windows / macOS / Linux 代码平台无关 + electron-builder 打包配置
- **性能**:长对话虚拟滚动(仅渲染可视区 + 实测高度)、增量合帧渲染、会话列表轻读(只读文件首尾)、进程池上限

## 截图

| 聊天 & 流式 | 工具 & thinking | 会话恢复 |
| --- | --- | --- |
| ![chat](shots/chat.png) | ![tools](shots/tools.png) | ![resume](shots/resume-history.png) |

更多:[streaming](shots/streaming.png) · [model picker](shots/model-picker.png) · [command palette](shots/palette.png) · [settings](shots/settings-models.png)

## 环境要求

- **Node.js ≥ 20**(开发/构建)
- **[oh-my-pi (omp)](https://omp.sh/)** 已安装(运行时探测 `PATH` → 各平台常见安装位置,可在 设置 → 数据 中查看)
- 首次运行需 omp 已配置 API Key(见 omp 文档)

## 安装

| 平台 | 产物 | 说明 |
| --- | --- | --- |
| Windows x64 | `OmpDesk-<version>-win-x64.exe` | NSIS 安装包(可选安装目录、桌面快捷方式) |
| macOS (Apple Silicon + Intel) | `OmpDesk-<version>-mac-universal.dmg` | universal 单包双架构;需在 macOS 构建;首次打开:右键 → 打开 |
| Linux x64 | `OmpDesk-<version>-linux-x86_64.AppImage` · `-linux-amd64.deb` | AppImage 需 `chmod +x` |

最新版本请从 **Releases** 获取,发布流程与逐版本更新日志见 [RELEASE.md](RELEASE.md)。

**自动更新:** 打包版启动约 10 秒后静默检查 GitHub Releases(自动下载)。新版本就绪时弹出系统通知 + 应用内 banner,一键 *重启安装*;也可通过托盘 → *检查更新…* 手动触发。macOS 自动更新需要 Developer ID 签名(未签名版本请手动更新)。

## 开发

```bash
npm install          # 安装依赖(国内网络可设 ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/)
npm run dev          # 启动开发模式(热更新)
npm run typecheck    # 类型检查(主进程 + 渲染进程)
npm run build        # 构建产物到 out/
npm run smoke        # 协议层冒烟测试(只读 RPC,不消耗 API)
```

## 测试

```bash
npx tsx scripts/verify-ask.mts   # UI 请求管道验证(confirm/select/超时兜底)
node scripts/e2e.mjs             # 端到端: 启动 → 新建会话 → 真实 prompt 流式回复 → 工具卡片
node scripts/e2e-resume.mjs      # 恢复续聊: 历史渲染 → 跟进消息 → 同会话继续
node scripts/e2e-settings.mjs    # 设置五组 / 命令面板 / 模型下拉
node scripts/e2e-perf.mjs        # 大会话性能(虚拟滚动窗口行数 / 渲染耗时 / 滚动帧耗时)
```

> E2E 脚本基于 Playwright `_electron`,会真实调用 omp 并消耗少量 API 额度。

## 打包(三平台)

```bash
npm run build:win     # 构建前端 + Windows NSIS 安装包(在 Windows 上构建)
npm run build:mac     # 构建前端 + macOS DMG(需在 macOS 上构建)
npm run build:linux   # 构建前端 + Linux AppImage + deb(需在 Linux 上构建)
```

仅改打包配置、前端已构建时,直接用 `pack:*` 跳过 Vite 构建,快数倍:

```bash
npm run pack:win      # electron-builder --win
npm run pack:dir      # 快速验证(未打包目录)
```

提速说明:asar 采用 `compression: store`(代码已 minify,体积差 ~10%)、deb 用 `gz` 替代极慢的 xz;electron / electron-builder 二进制本地缓存 + `.npmrc` 镜像下载;CI 按平台缓存工具链下载目录(见 `.github/workflows/release.yml`)。配置见 `electron-builder.yml`。正式发布建议替换 `resources/icon.png` 为 1024×1024 设计稿(当前为脚本生成的占位图标,见 `scripts/gen-icon.mjs`)。

## 发布流程

发布由 GitHub Actions 全自动完成:推送 `v<semver>` tag 后,流水线构建 Windows(NSIS)、macOS(universal DMG + zip)与 Linux(AppImage + deb),并发布 GitHub Release —— notes 从 `CHANGELOG.md` 对应版本条目自动提取,同时上传应用内自动更新所需的 `latest*.yml` 元数据。

```
更新版本号 + CHANGELOG → git tag vX.Y.Z → git push --tags → CI 构建并发布
```

逐步操作、验证清单与故障处理见 **[RELEASE.md](RELEASE.md)**。

## 架构

```
┌─────────────────────── 渲染进程 (React + zustand) ───────────────────────┐
│ Sidebar / ChatView(虚拟滚动) / MessageBubble / ToolCard / AskCard /      │
│ Composer / TodoPanel / ModelPicker / SettingsModal / CommandPalette      │
└──────────────▲──────────────────────────────────────────▲────────────────┘
        IPC 事件(onEvent)                       IPC 调用(invoke)
┌──────────────┴──────────────────────────────────────────┴────────────────┐
│ 主进程 (Electron)                                                        │
│  ├─ omp/locate.ts     三平台二进制探测                                    │
│  ├─ omp/protocol.ts   NDJSON 分帧 + v2 协商 + rpc_chunk 大帧重组          │
│  ├─ omp/client.ts     命令/响应关联、事件分发、UI 请求(超时兜底)          │
│  ├─ omp/pool.ts       按工作目录进程池(LRU / 空闲回收 / 配置变更重启)     │
│  ├─ omp/sessions.ts   会话扫描(轻读首尾)/ 解析(JSONL v3) / 删除 / 导出    │
│  ├─ omp/config.ts     config.yml / models.yml 读写(写前备份 + 原子写)     │
│  ├─ omp/profiles.ts   CC Switch 式方案(safeStorage 加密 Key)              │
│  ├─ omp/mcp.ts        mcp.json 合并(用户/项目/兼容源)                     │
│  ├─ omp/skills.ts     SKILL.md 发现 + 启停                                │
│  └─ updater.ts        electron-updater(GitHub Releases 源, 托盘手动检查,  │
│                       关于对话框)                                         │
└──────────────────────────────▲───────────────────────────────────────────┘
                        spawn --mode rpc-ui (stdio NDJSON)
┌──────────────────────────────┴───────────────────────────────────────────┐
│ omp (oh-my-pi CLI) — 会话存于 ~/.omp/agent/sessions/*.jsonl              │
└───────────────────────────────────────────────────────────────────────────┘
```

## 数据与安全

- **会话**:直接复用 omp 的 `~/.omp/agent/sessions/`(jsonl),不复制数据
- **配置方案**:API Key 经 Electron safeStorage 加密后存于应用 userData,写回 `models.yml` 前自动备份(`*.bak`)
- **MCP / Skills**:启停写入 `~/.omp/agent/mcp.json` / `config.yml`,均写前备份
- **会话删除**:删除 jsonl + 同名子会话目录(omp 的 agent.db 索引为缓存,可能残留空行,不影响使用)

## 已知限制

- mac/Linux 打包需对应平台构建(代码已平台无关,本机为 Windows 验证)
- MCP 运行态连接状态 v1 仅显示配置态,变更后重启会话生效
- 审批始终受 omp 配置 `tools.approval.*` 规则约束(如 `bash: allow` 时不弹确认)
- 图标为脚本生成的占位图

## License

MIT — © amiliyaai
