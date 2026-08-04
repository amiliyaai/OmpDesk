/** 中文字典(默认语言, key 基准) */

export const zh = {
  common: {
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    save: '保存',
    edit: '编辑',
    close: '关闭',
    apply: '应用',
    browse: '浏览…',
    none: '无',
    unknown: '未知',
    truncated: '… (已截断, 共 {n} 字符)',
    copy: '复制',
    copied: '已复制',
    scrollTop: '回到顶部'
  },

  time: {
    justNow: '刚刚',
    minutesAgo: '{n} 分钟前',
    yesterday: '昨天',
    daysAgo: '{n} 天前',
    monthDay: '{m}月{d}日'
  },

  app: {
    booting: 'OmpDesk 启动中…',
    startingSession: '正在启动会话进程…',
    newSession: '新会话',
    updateDownloaded: '新版本 v{version} 已下载, 重启后生效',
    restartInstall: '重启安装',
    later: '稍后'
  },

  sidebar: {
    newChat: '新建对话',
    searchPlaceholder: '搜索会话…',
    clearSearch: '清空 (Esc)',
    pinned: '已固定',
    unknownWorkspace: '(未知)',
    noMatch: '没有匹配的会话',
    empty: '还没有会话,开始第一个对话吧',
    connected: '已连接',
    disconnected: '未连接',
    ompConnected: 'omp 已连接',
    ompDisconnected: 'omp 未连接',
    settings: '设置',
    pin: '固定',
    unpin: '取消固定',
    rename: '重命名',
    more: '更多',
    exportHtml: '导出 HTML',
    deleteSession: '删除会话',
    deleteSessionMsg: '删除「{title}」?\n会话文件及其子会话将被移除, 无法恢复。',
    untitled: '无标题会话'
  },

  empty: {
    ready: 'oh-my-pi 桌面端 · omp {version} 已就绪',
    notFound: '未检测到 omp,请到 设置 → 数据 中确认安装路径',
    startNew: '开始新对话',
    recents: '最近会话',
    hint: '提示: 粘贴图片可直接发送 · Ctrl+K 打开命令面板 · 右上角切换模型'
  },

  chat: {
    placeholder: '给 omp 发送消息 (Enter 发送, Shift+Enter 换行)',
    placeholderRunning: '助手正在执行… 可发送消息打断',
    send: '发送 (Enter)',
    stop: '停止生成',
    copyMessage: '复制消息',
    copyCode: '复制代码',
    code: 'code',
    tokens: '↑{in}k ↓{out}k tokens',
    thinking: '思考过程',
    thinkLen: '{n} 字',
    autoCompacting: '⟳ 上下文过长,正在自动压缩…',
    compacted: '✓ 上下文已压缩{summary}',
    error: '错误'
  },

  tool: {
    queued: '排队中',
    running: '执行中',
    done: '完成',
    failed: '失败',
    viewResult: '查看结果',
    args: '参数',
    result: '结果',
    copyResult: '复制结果'
  },

  statusbar: {
    alwaysAsk: '始终询问',
    writeAuto: '写入自动',
    yolo: '全自动',
    byOmp: '按 omp 配置',
    thinking: '思考中…',
    executing: '执行中: {tool}',
    processing: '处理中…',
    ready: '就绪',
    model: '模型: {name}',
    execTitle: '当前执行状态',
    approvalTitle: '审批模式 (点击修改)'
  },

  palette: {
    placeholder: '输入命令,如 /help、/model…',
    newDesc: '新建会话',
    resumeDesc: '恢复会话',
    clearDesc: '清空当前会话',
    noMatch: '无匹配命令'
  },

  model: {
    default: '默认模型',
    switchTitle: '切换模型 (运行时生效)',
    available: '可用模型',
    refresh: '刷新',
    empty: '暂无模型列表(未连接或未配置)'
  },

  ask: {
    needConfirm: '需要确认',
    pleaseSelect: '请选择',
    editContent: '编辑内容',
    pleaseInput: '请输入',
    submit: '提交',
    gotIt: '知道了'
  },

  todo: {
    tasks: '任务'
  },

  notices: {
    newSessionFailed: '新建会话失败: {error}',
    parseSessionFailed: '无法解析会话文件',
    switchSessionFailed: '切换会话失败: {error}(仅展示历史, 发送消息将新建会话)',
    startSessionFailed: '启动会话失败: {error}',
    sendFailed: '发送失败: {error}',
    setModelFailed: '切换模型失败: {error}',
    deleteFailed: '删除失败: {error}',
    exported: '已导出: {path}',
    exportFailed: '导出失败: {error}',
    saveMcpFailed: '保存 MCP 服务器失败: {error}',
    skillFailed: 'Skills 操作失败: {error}',
    profileApplied: '方案已应用,会话进程已重启',
    applyProfileFailed: '应用方案失败: {error}',
    saveProfileFailed: '保存方案失败: {error}',
    approvalUpdated: '审批模式已更新,会话进程已重启',
    imageLimit: '最多附加 {n} 张图片',
    imageSkipped: '{n} 张图片超过 4MB 限制, 已跳过'
  },

  settings: {
    title: '设置',
    sectionPersonal: '个人',
    sectionAgent: 'Agent',
    sectionSystem: '系统',
    tabGeneral: '常规',
    tabModels: '模型服务',
    tabMcp: 'MCP',
    tabSkills: 'Skills',
    tabIntegrations: '集成',
    tabAppearance: '外观',
    tabData: '数据',
    tabUsage: '用量',
    tabBackend: '后端',
    tabAbout: '关于',
    usagePlaceholder: 'Token 用量统计将在后续版本提供。',
    backendPlaceholder: 'Agent 后端选择(omp / pi)将在后续版本提供。',
    aboutCopyright: '© amiliyaai · MIT License',
    aboutRepo: 'github.com/amiliyaai/OmpDesk',
    approvalMode: '审批模式',
    approvalPlaceholder: '按 omp 配置',
    approvalAlwaysAsk: '始终询问 (推荐)',
    approvalWrite: '写入自动 (write)',
    approvalYolo: '全自动 (yolo)',
    approvalHint: 'always-ask: 读写都询问; write: 写入自动、执行询问; yolo: 全部自动批准。改动后 omp 进程自动重启。',
    profiles: '配置方案 (一键切换)',
    profilesEmpty: '还没有方案。方案 = 供应商 + API Key + 模型角色映射 + 审批模式,一键应用到 omp 配置(写前自动备份)。',
    profileDefaultModelUnset: '默认模型未设',
    deleteProfileTitle: '删除方案',
    deleteProfileMsg: '删除方案「{name}」?',
    newProfile: '新建方案',
    providers: '供应商 (models.yml, 只读)',
    providersEmpty: '未发现供应商配置 (~/.omp/agent/models.yml)',
    keyConfigured: '已配置 API Key(脱敏显示)',
    keyMissing: '未配置 Key',
    modelsCount: '{n} 个模型',
    noKey: '无 Key',
    mcpServers: 'MCP 服务器',
    mcpHint: '用户级写入 ~/.omp/agent/mcp.json(写前备份);项目级与兼容来源只读展示。改动后需重启会话生效。',
    mcpSource: '来源: {source}',
    deleteMcpTitle: '删除 MCP 服务器',
    deleteMcpMsg: '删除 MCP 服务器「{name}」?',
    addServer: '添加服务器',
    skillsTitle: 'Skills (~/.omp/skills 等, SKILL.md 发现)',
    skillsHint: '关闭 = 写入 config.yml 的 skills.ignoredSkills。',
    noDescription: '(无描述)',
    noSkills: '未发现 skills。',
    theme: '主题',
    themeSystem: '跟随系统',
    themeDark: '深色',
    themeLight: '浅色',
    language: '语言 (应用 UI)',
    fontSize: '字体大小',
    defaultWorkspace: '默认工作目录',
    hotkey: '全局快捷键 (唤起窗口)',
    sessionProcess: '会话进程',
    sessionProcessHint: '最多进程: {max} · 空闲回收: {min} 分钟',
    ompSection: 'omp',
    ompPathHint: '路径: {path}{detected}',
    autoDetected: ' (自动探测)',
    notDetected: '(未检测到)',
    viewOmpLogs: '查看 omp 日志',
    noLogs: '无日志',
    about: '关于',
    aboutHint: 'OmpDesk v{version} · oh-my-pi 桌面客户端 · 会话目录 ~/.omp/agent',
    profileName: '方案名称',
    profileNamePlaceholder: '如: 生产环境',
    provider: '供应商',
    providerPlaceholder: '选择供应商…',
    apiKey: 'API Key (safeStorage 加密存储)',
    apiKeyPlaceholder: '留空则不改动',
    roleModels: '模型角色映射',
    rolePlaceholder: 'provider/model',
    saveProfile: '保存方案',
    serverName: '服务器名称',
    serverNamePlaceholder: '如: github',
    transport: '传输类型',
    stdioLabel: 'stdio (本地命令)',
    command: '命令',
    commandPlaceholder: 'npx -y @modelcontextprotocol/server-github',
    argsLabel: '参数 (空格分隔)',
    argsPlaceholder: '--port 8080',
    urlLabel: 'URL',
    urlPlaceholder: 'https://example.com/mcp',
    envVars: '环境变量 (每行 KEY=VALUE)',
    saveMcp: '保存'
  },

  menubar: {
    file: '文件',
    edit: '编辑',
    view: '视图',
    help: '帮助',
    newChat: '新聊天',
    openFolder: '打开文件夹',
    settings: '设置',
    close: '关闭',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    zoomIn: '放大',
    zoomOut: '缩小',
    resetZoom: '实际大小',
    fullscreen: '切换全屏',
    toggleFiles: '切换文件面板',
    checkUpdates: '检查更新…',
    about: '关于'
  },

  files: {
    title: '文件',
    session: '会话文件',
    workspace: '工作区',
    emptySession: '会话暂无文件 — agent 读写文件后会自动出现在这里',
    emptyWorkspace: '文件树为空',
    readFailed: '读取失败: {error}',
    openFailed: '无法打开文件'
  },

  tray: {
    open: '打开 OmpDesk',
    newSession: '新建会话',
    checkUpdates: '检查更新…',
    about: '关于 OmpDesk',
    quit: '退出',
    minimizeHint: 'OmpDesk 已最小化到系统托盘, 可从托盘菜单完全退出',
    tooltip: 'OmpDesk — oh-my-pi 桌面端'
  },

  notify: {
    sessionDoneTitle: 'OmpDesk · 会话完成'
  },

  about: {
    title: '关于 OmpDesk',
    desc: 'oh-my-pi (omp) 的桌面 GUI 客户端 —— 给终端 AI 编程助手一个家。',
    version: '版本 {version}',
    openGithub: '打开 GitHub'
  },

  updater: {
    readyTitle: 'OmpDesk 更新已就绪',
    readyBody: 'v{version} 已下载, 点击重启安装',
    checkTitle: '检查更新',
    upToDate: 'OmpDesk 已是最新版本',
    currentVersion: '当前版本 v{version}',
    failTitle: '检查更新失败',
    failMessage: '无法检查更新',
    failDetail: '请确认网络连接并稍后重试。\n{error}',
    devModeMessage: '开发模式不检查更新',
    devModeDetail: '自动更新仅在打包版本中启用。'
  },

  ipc: {
    parseFailed: '会话文件无法解析',
    pickDirTitle: '选择工作目录'
  }
} as const
