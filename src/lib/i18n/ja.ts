/** 日本語辞書(keys must match zh.ts) */
import type { DictShape } from './types'

export const ja = {
  common: {
    cancel: 'キャンセル',
    confirm: '確認',
    delete: '削除',
    save: '保存',
    edit: '編集',
    close: '閉じる',
    apply: '適用',
    browse: '参照…',
    none: 'なし',
    unknown: '不明',
    truncated: '… (省略, 全{n}文字)',
    copy: 'コピー',
    copied: 'コピー済み',
    scrollTop: '先頭へ戻る'
  },

  time: {
    justNow: 'たった今',
    minutesAgo: '{n} 分前',
    yesterday: '昨日',
    daysAgo: '{n} 日前',
    monthDay: '{m}月{d}日'
  },

  app: {
    booting: 'OmpDesk 起動中…',
    startingSession: 'セッションプロセスを起動中…',
    newSession: '新規セッション',
    updateDownloaded: '新バージョン v{version} をダウンロードしました。再起動後に反映されます',
    restartInstall: '再起動してインストール',
    later: '後で'
  },

  sidebar: {
    newChat: '新しいチャット',
    searchPlaceholder: 'セッションを検索…',
    clearSearch: 'クリア (Esc)',
    pinned: '固定中',
    unknownWorkspace: '(不明)',
    noMatch: '一致するセッションがありません',
    empty: 'セッションがまだありません。最初のチャットを始めましょう',
    connected: '接続済み',
    disconnected: '未接続',
    ompConnected: 'omp 接続済み',
    ompDisconnected: 'omp 未接続',
    settings: '設定',
    pin: '固定',
    unpin: '固定解除',
    rename: '名前を変更',
    more: 'その他',
    exportHtml: 'HTML をエクスポート',
    deleteSession: 'セッションを削除',
    deleteSessionMsg: '「{title}」を削除しますか?\nセッションファイルと子セッションは削除され、元に戻せません。',
    untitled: '無題のセッション'
  },

  empty: {
    ready: 'oh-my-pi デスクトップ · omp {version} 準備完了',
    notFound: 'omp を検出できません。設定 → データでインストールパスを確認してください',
    startNew: '新しいチャットを開始',
    recents: '最近のセッション',
    hint: 'ヒント: 画像を貼り付けて送信 · Ctrl+K でコマンドパレット · 右上でモデル切替'
  },

  chat: {
    placeholder: 'omp にメッセージを送信 (Enter で送信, Shift+Enter で改行)',
    placeholderRunning: 'エージェント実行中… メッセージを送信して中断できます',
    send: '送信 (Enter)',
    stop: '生成を停止',
    copyMessage: 'メッセージをコピー',
    copyCode: 'コードをコピー',
    code: 'code',
    tokens: '↑{in} ↓{out} tokens',
    sessionTokens: 'Σ ↑{in}k ↓{out}k',
    processSummary: 'プロセス · メッセージ {messages} 件 · ツール呼び出し {tools} 回',
    thinking: '思考過程',
    thinkLen: '{n} 文字',
    autoCompacting: '⟳ コンテキストが長すぎるため自動圧縮中…',
    compacted: '✓ コンテキストを圧縮しました{summary}',
    error: 'エラー'
  },

  tool: {
    queued: '待機中',
    running: '実行中',
    done: '完了',
    failed: '失敗',
    viewResult: '結果を表示',
    args: '引数',
    result: '結果',
    copyResult: '結果をコピー'
  },

  statusbar: {
    alwaysAsk: '常に確認',
    writeAuto: '書き込み自動',
    yolo: '全自動',
    byOmp: 'omp 設定に従う',
    thinking: '思考中…',
    executing: '実行中: {tool}',
    processing: '処理中…',
    ready: '準備完了',
    model: 'モデル: {name}',
    execTitle: '現在の実行状態',
    approvalTitle: '承認モード (クリックで変更)'
  },

  palette: {
    placeholder: 'コマンドを入力 (例: /help、/model…)',
    newDesc: '新規セッション',
    resumeDesc: 'セッションを再開',
    clearDesc: '現在のセッションをクリア',
    noMatch: '一致するコマンドがありません'
  },

  model: {
    default: 'デフォルトモデル',
    switchTitle: 'モデル切替 (実行時に反映)',
    available: '利用可能なモデル',
    refresh: '更新',
    empty: 'モデルがありません (未接続または未設定)'
  },

  ask: {
    needConfirm: '確認が必要です',
    pleaseSelect: '選択してください',
    editContent: '内容を編集',
    pleaseInput: '入力してください',
    submit: '送信',
    gotIt: '了解'
  },

  todo: {
    tasks: 'タスク'
  },

  notices: {
    newSessionFailed: 'セッションの作成に失敗: {error}',
    parseSessionFailed: 'セッションファイルを解析できません',
    switchSessionFailed: 'セッション切替に失敗: {error}(履歴のみ表示、送信すると新規作成されます)',
    startSessionFailed: 'セッションの起動に失敗: {error}',
    sendFailed: '送信に失敗: {error}',
    setModelFailed: 'モデル切替に失敗: {error}',
    deleteFailed: '削除に失敗: {error}',
    exported: 'エクスポート: {path}',
    exportFailed: 'エクスポートに失敗: {error}',
    saveMcpFailed: 'MCP サーバーの保存に失敗: {error}',
    skillFailed: 'Skills 操作に失敗: {error}',
    profileApplied: 'プロファイルを適用し、セッションプロセスを再起動しました',
    applyProfileFailed: 'プロファイルの適用に失敗: {error}',
    saveProfileFailed: 'プロファイルの保存に失敗: {error}',
    approvalUpdated: '承認モードを更新し、セッションプロセスを再起動しました',
    imageLimit: '画像は最大 {n} 枚まで添付できます',
    imageSkipped: '{n} 枚の画像が 4MB 制限を超えたためスキップされました'
  },

  settings: {
    title: '設定',
    sectionPersonal: '個人',
    sectionAgent: 'Agent',
    sectionSystem: 'システム',
    tabGeneral: '一般',
    tabModels: 'モデルサービス',
    tabMcp: 'MCP',
    tabSkills: 'Skills',
    tabIntegrations: '統合',
    tabAppearance: '外観',
    tabData: 'データ',
    tabUsage: '使用量',
    tabBackend: 'バックエンド',
    tabAbout: '情報',
    usagePlaceholder: '過去セッションの集計統計は今後のバージョンで提供予定です。',
    usageCurrent: '現在のセッション: ↑{in} ↓{out}(合計 {total} tokens)',
    usageTotal: '累計',
    usageWorkspaces: 'ワークスペース別',
    usageLoading: '過去セッションをスキャン中…',
    usageEmpty: '過去セッションのデータがありません',
    usageSessions: '{n} セッション',
    backendAgent: 'Agent バックエンド',
    backendAuto: '自動 (omp 優先)',
    backendHint: 'omp (oh-my-pi) と pi (earendil-works) は同源 — バイナリ・データディレクトリ (~/.omp/agent または ~/.pi/agent)・RPC モードを自動切替し、セッション/プラグインは互換です。切替時にプロセスプールとセッションリストが再構築されます。',
    aboutCopyright: '© amiliyaai · MIT License',
    aboutRepo: 'github.com/amiliyaai/OmpDesk',
    approvalMode: '承認モード',
    approvalPlaceholder: 'omp 設定に従う',
    approvalAlwaysAsk: '常に確認 (推奨)',
    approvalWrite: '書き込み自動 (write)',
    approvalYolo: '全自動 (yolo)',
    approvalHint: 'always-ask: 読み書きすべて確認; write: 書き込み自動・実行は確認; yolo: すべて自動承認。変更後 omp プロセスが再起動されます。',
    profiles: 'プロファイル (ワンクリック切替)',
    profilesEmpty: 'プロファイルがまだありません。プロファイル = プロバイダー + API Key + モデルロールマッピング + 承認モードで、omp 設定にワンクリック適用(書込前に自動バックアップ)。',
    profileDefaultModelUnset: 'デフォルトモデル未設定',
    deleteProfileTitle: 'プロファイルを削除',
    deleteProfileMsg: 'プロファイル「{name}」を削除しますか?',
    newProfile: '新しいプロファイル',
    providers: 'プロバイダー (models.yml, 読み取り専用)',
    providersEmpty: 'プロバイダー設定が見つかりません (~/.omp/agent/models.yml)',
    keyConfigured: 'API Key 設定済み(マスク表示)',
    keyMissing: 'Key 未設定',
    modelsCount: '{n} モデル',
    noKey: 'Key なし',
    mcpServers: 'MCP サーバー',
    mcpHint: 'ユーザー設定は ~/.omp/agent/mcp.json に書き込み(書込前にバックアップ);プロジェクト・互換ソースは読み取り専用。変更後セッションの再起動が必要です。',
    mcpSource: 'ソース: {source}',
    deleteMcpTitle: 'MCP サーバーを削除',
    deleteMcpMsg: 'MCP サーバー「{name}」を削除しますか?',
    addServer: 'サーバーを追加',
    skillsTitle: 'Skills (~/.omp/skills 等, SKILL.md 検出)',
    skillsHint: 'オフ = config.yml の skills.ignoredSkills に書き込み。',
    noDescription: '(説明なし)',
    noSkills: 'Skills が見つかりません。',
    theme: 'テーマ',
    themeSystem: 'システムに従う',
    themeDark: 'ダーク',
    themeLight: 'ライト',
    language: '言語 (アプリ UI)',
    fontSize: 'フォントサイズ',
    defaultWorkspace: 'デフォルトの作業ディレクトリ',
    hotkey: 'グローバルホットキー (ウィンドウ呼び出し)',
    sessionProcess: 'セッションプロセス',
    sessionProcessHint: '最大プロセス: {max} · アイドル回収: {min} 分',
    ompSection: 'omp',
    ompPathHint: 'パス: {path}{detected}',
    autoDetected: ' (自動検出)',
    notDetected: '(未検出)',
    viewOmpLogs: 'omp ログを表示',
    noLogs: 'ログなし',
    about: '情報',
    aboutHint: 'OmpDesk v{version} · oh-my-pi デスクトップクライアント · セッションディレクトリ ~/.omp/agent',
    profileName: 'プロファイル名',
    profileNamePlaceholder: '例: 本番環境',
    provider: 'プロバイダー',
    providerPlaceholder: 'プロバイダーを選択…',
    apiKey: 'API Key (safeStorage で暗号化)',
    apiKeyPlaceholder: '空欄のまま変更しない',
    roleModels: 'モデルロールマッピング',
    rolePlaceholder: 'provider/model',
    saveProfile: 'プロファイルを保存',
    serverName: 'サーバー名',
    serverNamePlaceholder: '例: github',
    transport: 'トランスポート',
    stdioLabel: 'stdio (ローカルコマンド)',
    command: 'コマンド',
    commandPlaceholder: 'npx -y @modelcontextprotocol/server-github',
    argsLabel: '引数 (スペース区切り)',
    argsPlaceholder: '--port 8080',
    urlLabel: 'URL',
    urlPlaceholder: 'https://example.com/mcp',
    envVars: '環境変数 (各行 KEY=VALUE)',
    saveMcp: '保存'
  },

  menubar: {
    file: 'ファイル',
    edit: '編集',
    view: '表示',
    help: 'ヘルプ',
    newChat: '新しいチャット',
    newWorktreeChat: '新しい Worktree チャット',
    openFolder: 'フォルダを開く',
    settings: '設定',
    close: '閉じる',
    undo: '元に戻す',
    redo: 'やり直し',
    cut: '切り取り',
    copy: 'コピー',
    paste: '貼り付け',
    selectAll: 'すべて選択',
    zoomIn: '拡大',
    zoomOut: '縮小',
    resetZoom: '実際のサイズ',
    fullscreen: '全画面表示',
    toggleFiles: 'ファイルパネル切替',
    checkUpdates: '更新を確認…',
    about: 'バージョン情報'
  },

  files: {
    title: 'ファイル',
    session: 'セッションファイル',
    workspace: 'ワークスペース',
    emptySession: 'セッションにファイルがありません — agent が操作したファイルがここに表示されます',
    emptyWorkspace: 'ファイルツリーは空です',
    readFailed: '読み込み失敗: {error}',
    openFailed: 'ファイルを開けません'
  },

  worktree: {
    title: 'Worktrees (並行ワークスペース)',
    notGit: '現在のデフォルトワークスペースは git リポジトリではありません — worktree を作成できません',
    invalidBranch: 'ブランチ名に不正な文字が含まれています (英数字と . _ / - のみ)',
    pathExists: '対象パスは既に存在します: {path}',
    notFound: 'Worktree が見つかりません',
    cannotRemoveMain: 'メインの worktree は削除できません',
    branchPlaceholder: 'ブランチ名 (空欄で自動生成)',
    create: 'Worktree を作成',
    open: 'ここでセッションを開く',
    remove: '削除',
    main: 'メイン',
    empty: 'Worktree はまだありません',
    removeConfirmTitle: 'Worktree を削除',
    removeConfirmMsg: 'Worktree「{branch}」を削除しますか?\n未コミットの変更があると削除に失敗します。',
    created: 'Worktree を作成しました: {branch}',
    createFailed: 'Worktree の作成に失敗: {error}',
    removed: 'Worktree を削除しました',
    removeFailed: 'Worktree の削除に失敗: {error}'
  },

  tray: {
    open: 'OmpDesk を開く',
    newSession: '新規セッション',
    checkUpdates: '更新を確認…',
    about: 'OmpDesk について',
    quit: '終了',
    minimizeHint: 'OmpDesk はシステムトレイに最小化されました。トレイメニューから完全に終了できます。',
    tooltip: 'OmpDesk — oh-my-pi デスクトップ'
  },

  notify: {
    sessionDoneTitle: 'OmpDesk · セッション完了'
  },

  about: {
    title: 'OmpDesk について',
    desc: 'oh-my-pi (omp) のデスクトップ GUI クライアント —— ターミナル AI コーディングアシスタントのためのホーム。',
    version: 'バージョン {version}',
    openGithub: 'GitHub を開く'
  },

  updater: {
    readyTitle: 'OmpDesk の更新準備完了',
    readyBody: 'v{version} をダウンロードしました。クリックで再起動してインストール',
    checkTitle: '更新を確認',
    upToDate: 'OmpDesk は最新です',
    currentVersion: '現在のバージョン v{version}',
    failTitle: '更新チェックに失敗',
    failMessage: '更新を確認できません',
    failDetail: 'ネットワーク接続を確認して、しばらくしてから再試行してください。\n{error}',
    devModeMessage: '開発モードでは更新を確認しません',
    devModeDetail: '自動更新はパッケージ版のみ有効です。'
  },

  ipc: {
    parseFailed: 'セッションファイルを解析できません',
    pickDirTitle: '作業ディレクトリを選択'
  },

  errors: {
    processExited: 'omp プロセスが終了しました (code={code}, signal={signal})',
    readyTimeout: 'omp ready 待機がタイムアウト ({ms}ms)',
    commandFailed: 'omp コマンドに失敗',
    processNotRunning: 'omp プロセスが実行されていません',
    commandTimeout: '{command} の応答待機がタイムアウト',
    toolFailed: 'ツール実行に失敗',
    sessionCompacted: 'セッションを圧縮しました: {summary}',
    illegalPath: '不正なパス',
    emptyTitle: 'タイトルを空にできません',
    profileMissing: 'プロファイルが見つかりません',
    decryptFailed: 'API Key を復号できません (システム暗号化が利用不可またはキーが無効)',
    pathEscape: 'パスがワークスペース外です',
    notFile: 'ファイルではありません',
    fileTooLarge: '{kb}KB を超えるファイルです'
  }
} as const satisfies DictShape
