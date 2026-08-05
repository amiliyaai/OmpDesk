/** English dictionary (keys must match zh.ts) */
import type { DictShape } from './types'

export const en = {
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    save: 'Save',
    edit: 'Edit',
    close: 'Close',
    apply: 'Apply',
    browse: 'Browse…',
    none: 'None',
    unknown: 'Unknown',
    truncated: '… (truncated, {n} chars)',
    copy: 'Copy',
    copied: 'Copied',
    scrollTop: 'Back to top'
  },

  time: {
    justNow: 'just now',
    minutesAgo: '{n} min ago',
    yesterday: 'yesterday',
    daysAgo: '{n} days ago',
    monthDay: '{m}/{d}'
  },

  app: {
    booting: 'OmpDesk is starting…',
    startingSession: 'Starting session process…',
    newSession: 'New session',
    updateDownloaded: 'New version v{version} downloaded, takes effect after restart',
    restartInstall: 'Restart & Install',
    later: 'Later'
  },

  sidebar: {
    newChat: 'New Chat',
    searchPlaceholder: 'Search sessions…',
    clearSearch: 'Clear (Esc)',
    pinned: 'Pinned',
    unknownWorkspace: '(unknown)',
    noMatch: 'No matching sessions',
    empty: 'No sessions yet, start your first chat',
    connected: 'Connected',
    disconnected: 'Disconnected',
    ompConnected: 'omp connected',
    ompDisconnected: 'omp disconnected',
    settings: 'Settings',
    pin: 'Pin',
    unpin: 'Unpin',
    rename: 'Rename',
    more: 'More',
    exportHtml: 'Export HTML',
    deleteSession: 'Delete session',
    deleteSessionMsg: 'Delete "{title}"?\nThe session file and its child sessions will be removed. This cannot be undone.',
    untitled: 'Untitled session'
  },

  empty: {
    ready: 'oh-my-pi desktop · omp {version} ready',
    notFound: 'omp not detected. Check the install path in Settings → Data',
    startNew: 'Start a New Chat',
    recents: 'Recent Sessions',
    hint: 'Tip: paste images to send · Ctrl+K opens the command palette · switch models top-right'
  },

  chat: {
    placeholder: 'Message omp (Enter to send, Shift+Enter for newline)',
    placeholderRunning: 'Agent is working… you can send a message to interrupt',
    send: 'Send (Enter)',
    stop: 'Stop generating',
    copyMessage: 'Copy message',
    copyCode: 'Copy code',
    code: 'code',
    tokens: '↑{in} ↓{out} tokens',
    sessionTokens: 'Σ ↑{in}k ↓{out}k',
    processSummary: 'Process · {messages} messages · {tools} tool calls',
    thinking: 'Thinking',
    thinkLen: '{n} chars',
    autoCompacting: '⟳ Context too long, auto-compacting…',
    compacted: '✓ Context compacted{summary}',
    error: 'Error'
  },

  tool: {
    queued: 'Queued',
    running: 'Running',
    done: 'Done',
    failed: 'Failed',
    viewResult: 'View result',
    args: 'Arguments',
    result: 'Result',
    copyResult: 'Copy result'
  },

  statusbar: {
    alwaysAsk: 'Always ask',
    writeAuto: 'Auto-write',
    yolo: 'Full auto',
    byOmp: 'Per omp config',
    thinking: 'Thinking…',
    executing: 'Executing: {tool}',
    processing: 'Processing…',
    ready: 'Ready',
    model: 'Model: {name}',
    execTitle: 'Current execution status',
    approvalTitle: 'Approval mode (click to change)'
  },

  palette: {
    placeholder: 'Type a command, e.g. /help, /model…',
    newDesc: 'New session',
    resumeDesc: 'Resume session',
    clearDesc: 'Clear current session',
    noMatch: 'No matching commands'
  },

  model: {
    default: 'Default model',
    switchTitle: 'Switch model (takes effect at runtime)',
    available: 'Available Models',
    refresh: 'Refresh',
    empty: 'No models (not connected or not configured)'
  },

  ask: {
    needConfirm: 'Confirmation required',
    pleaseSelect: 'Please select',
    editContent: 'Edit content',
    pleaseInput: 'Please enter',
    submit: 'Submit',
    gotIt: 'Got it'
  },

  todo: {
    tasks: 'Tasks'
  },

  notices: {
    newSessionFailed: 'Failed to create session: {error}',
    parseSessionFailed: 'Cannot parse session file',
    switchSessionFailed: 'Failed to switch session: {error} (history shown only, sending will create a new session)',
    startSessionFailed: 'Failed to start session: {error}',
    sendFailed: 'Failed to send: {error}',
    setModelFailed: 'Failed to switch model: {error}',
    deleteFailed: 'Failed to delete: {error}',
    exported: 'Exported: {path}',
    exportFailed: 'Export failed: {error}',
    saveMcpFailed: 'Failed to save MCP server: {error}',
    skillFailed: 'Skills operation failed: {error}',
    profileApplied: 'Profile applied, session processes restarted',
    applyProfileFailed: 'Failed to apply profile: {error}',
    saveProfileFailed: 'Failed to save profile: {error}',
    approvalUpdated: 'Approval mode updated, session processes restarted',
    imageLimit: 'At most {n} images can be attached',
    imageSkipped: '{n} images exceeded the 4MB limit and were skipped'
  },

  settings: {
    title: 'Settings',
    sectionPersonal: 'Personal',
    sectionAgent: 'Agent',
    sectionSystem: 'System',
    tabGeneral: 'General',
    tabModels: 'Model Service',
    tabMcp: 'MCP',
    tabSkills: 'Skills',
    tabIntegrations: 'Integrations',
    tabAppearance: 'Appearance',
    tabData: 'Data',
    tabUsage: 'Usage',
    tabBackend: 'Backend',
    tabAbout: 'About',
    usagePlaceholder: 'Aggregate stats for history sessions will be available in a future release.',
    usageCurrent: 'Current session: ↑{in} ↓{out} ({total} tokens total)',
    usageTotal: 'All-time Total',
    usageWorkspaces: 'By Workspace',
    usageLoading: 'Scanning history sessions…',
    usageEmpty: 'No history session data yet',
    usageSessions: '{n} sessions',
    backendAgent: 'Agent Backend',
    backendAuto: 'Auto (omp first)',
    backendHint: 'omp (oh-my-pi) and pi (earendil-works) share the same origin — binary, data dir (~/.omp/agent or ~/.pi/agent) and RPC mode switch automatically; sessions and plugins are compatible. The process pool and session list will be rebuilt on switch.',
    aboutCopyright: '© amiliyaai · MIT License',
    aboutRepo: 'github.com/amiliyaai/OmpDesk',
    approvalMode: 'Approval Mode',
    approvalPlaceholder: 'Per omp config',
    approvalAlwaysAsk: 'Always ask (recommended)',
    approvalWrite: 'Auto-write (write)',
    approvalYolo: 'Full auto (yolo)',
    approvalHint: 'always-ask: ask on every read/write; write: auto-approve writes, ask on execution; yolo: auto-approve everything. Changing restarts the omp process.',
    profiles: 'Profiles (one-click switch)',
    profilesEmpty: 'No profiles yet. A profile = provider + API key + model role mapping + approval mode, applied to omp config in one click (auto-backup before write).',
    profileDefaultModelUnset: 'default model not set',
    deleteProfileTitle: 'Delete profile',
    deleteProfileMsg: 'Delete profile "{name}"?',
    newProfile: 'New Profile',
    providers: 'Providers (models.yml, read-only)',
    providersEmpty: 'No provider config found (~/.omp/agent/models.yml)',
    keyConfigured: 'API key configured (masked)',
    keyMissing: 'No key',
    modelsCount: '{n} models',
    noKey: 'no key',
    mcpServers: 'MCP Servers',
    mcpHint: 'User-level config is written to ~/.omp/agent/mcp.json (backed up before write); project-level and compat sources are read-only. Servers imported from Claude Code / Codex / Cursor etc. are shown read-only. Restart the session to apply changes.',
    mcpSource: 'source: {source}',
    deleteMcpTitle: 'Delete MCP server',
    deleteMcpMsg: 'Delete MCP server "{name}"?',
    addServer: 'Add Server',
    skillsTitle: 'Skills (~/.omp/skills, ~/.agents/skills etc., SKILL.md discovery)',
    skillsHint: 'Disabling writes skills.ignoredSkills in config.yml.',
    noDescription: '(no description)',
    noSkills: 'No skills found.',
    skillRootUser: 'user',
    skillRootProject: 'project',
    skillRootManaged: 'managed',
    skillRootPlugins: 'plugin',
    theme: 'Theme',
    themeSystem: 'System',
    themeDark: 'Dark',
    themeLight: 'Light',
    language: 'Language (app UI)',
    fontSize: 'Font Size',
    defaultWorkspace: 'Default Workspace',
    hotkey: 'Global Hotkey (summon window)',
    sessionProcess: 'Session Processes',
    sessionProcessHint: 'Max processes: {max} · Idle reclamation: {min} min',
    ompSection: 'omp',
    ompPathHint: 'Path: {path}{detected}',
    autoDetected: ' (auto-detected)',
    notDetected: '(not detected)',
    viewOmpLogs: 'View omp logs',
    noLogs: 'No logs',
    about: 'About',
    aboutHint: 'OmpDesk v{version} · oh-my-pi desktop client · session dir ~/.omp/agent',
    profileName: 'Profile Name',
    profileNamePlaceholder: 'e.g. Production',
    provider: 'Provider',
    providerPlaceholder: 'Select provider…',
    apiKey: 'API Key (safeStorage encrypted)',
    apiKeyPlaceholder: 'Leave empty to keep unchanged',
    roleModels: 'Model Role Mapping',
    rolePlaceholder: 'provider/model',
    saveProfile: 'Save Profile',
    serverName: 'Server Name',
    serverNamePlaceholder: 'e.g. github',
    transport: 'Transport',
    stdioLabel: 'stdio (local command)',
    command: 'Command',
    commandPlaceholder: 'npx -y @modelcontextprotocol/server-github',
    argsLabel: 'Arguments (space-separated)',
    argsPlaceholder: '--port 8080',
    urlLabel: 'URL',
    urlPlaceholder: 'https://example.com/mcp',
    envVars: 'Environment Variables (KEY=VALUE per line)',
    saveMcp: 'Save'
  },

  menubar: {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    help: 'Help',
    newChat: 'New Chat',
    newWorktreeChat: 'New Worktree Chat',
    openFolder: 'Open Folder',
    settings: 'Settings',
    close: 'Close',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Actual Size',
    fullscreen: 'Toggle Full Screen',
    toggleFiles: 'Toggle File Panel',
    checkUpdates: 'Check for Updates…',
    about: 'About'
  },

  files: {
    title: 'Files',
    session: 'Session Files',
    workspace: 'Workspace',
    emptySession: 'No session files yet — files the agent touches will appear here',
    emptyWorkspace: 'File tree is empty',
    readFailed: 'Read failed: {error}',
    openFailed: 'Cannot open file'
  },

  worktree: {
    title: 'Worktrees (parallel workspaces)',
    notGit: 'The current default workspace is not a git repository — cannot create worktrees',
    invalidBranch: 'Branch name contains illegal characters (only letters, digits, . _ / -)',
    pathExists: 'Target path already exists: {path}',
    notFound: 'Worktree not found',
    cannotRemoveMain: 'Cannot remove the main worktree',
    branchPlaceholder: 'Branch name (empty = auto-generate)',
    create: 'Create Worktree',
    open: 'Open session here',
    remove: 'Remove',
    main: 'main',
    empty: 'No worktrees yet',
    removeConfirmTitle: 'Remove Worktree',
    removeConfirmMsg: 'Remove worktree "{branch}"?\nRemoval fails if there are uncommitted changes.',
    created: 'Worktree created: {branch}',
    createFailed: 'Failed to create worktree: {error}',
    removed: 'Worktree removed',
    removeFailed: 'Failed to remove worktree: {error}'
  },

  tray: {
    open: 'Open OmpDesk',
    newSession: 'New Session',
    checkUpdates: 'Check for Updates…',
    about: 'About OmpDesk',
    quit: 'Quit',
    minimizeHint: 'OmpDesk minimized to system tray. Use the tray menu to quit completely.',
    tooltip: 'OmpDesk — oh-my-pi desktop'
  },

  notify: {
    sessionDoneTitle: 'OmpDesk · Session finished'
  },

  about: {
    title: 'About OmpDesk',
    desc: 'Desktop GUI client for oh-my-pi (omp) — a home for your terminal AI coding assistant.',
    version: 'Version {version}',
    openGithub: 'Open GitHub'
  },

  updater: {
    readyTitle: 'OmpDesk update ready',
    readyBody: 'v{version} downloaded, click to restart and install',
    checkTitle: 'Check for Updates',
    upToDate: 'OmpDesk is up to date',
    currentVersion: 'Current version v{version}',
    failTitle: 'Update check failed',
    failMessage: 'Cannot check for updates',
    failDetail: 'Please check your network connection and try again later.\n{error}',
    devModeMessage: 'Updates are not checked in dev mode',
    devModeDetail: 'Auto-update is only enabled in packaged builds.'
  },

  ipc: {
    parseFailed: 'Cannot parse session file',
    pickDirTitle: 'Select workspace'
  },

  errors: {
    processExited: 'omp process exited (code={code}, signal={signal})',
    readyTimeout: 'Timed out waiting for omp ready ({ms}ms)',
    commandFailed: 'omp command failed',
    processNotRunning: 'omp process not running',
    commandTimeout: 'Timed out waiting for {command} response',
    toolFailed: 'Tool execution failed',
    sessionCompacted: 'Session compacted: {summary}',
    illegalPath: 'Illegal path',
    emptyTitle: 'Title cannot be empty',
    profileMissing: 'Profile not found',
    decryptFailed: 'Cannot decrypt API key (system encryption unavailable or key invalid)',
    pathEscape: 'Path escapes workspace',
    notFile: 'Not a file',
    fileTooLarge: 'File exceeds {kb}KB limit'
  }
} as const satisfies DictShape
