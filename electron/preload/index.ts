import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  MainEvent,
  McpServerDraft,
  OmpApi,
  UiResponsePayload
} from '../../src/shared/types'

const api: OmpApi = {
  bootstrap: () => ipcRenderer.invoke('omp:bootstrap'),
  getSessions: () => ipcRenderer.invoke('omp:getSessions'),
  getSessionDetail: (filePath: string) => ipcRenderer.invoke('omp:getSessionDetail', filePath),
  deleteSession: (filePath: string) => ipcRenderer.invoke('omp:deleteSession', filePath),
  renameSession: (filePath: string, title: string) =>
    ipcRenderer.invoke('omp:renameSession', filePath, title),
  exportSession: (filePath: string) => ipcRenderer.invoke('omp:exportSession', filePath),
  newSession: (workspace: string) => ipcRenderer.invoke('omp:newSession', workspace),
  openSession: (filePath: string) => ipcRenderer.invoke('omp:openSession', filePath),
  sendPrompt: (text: string, images?: string[]) =>
    ipcRenderer.invoke('omp:sendPrompt', text, images),
  abort: () => ipcRenderer.invoke('omp:abort'),
  getModels: () => ipcRenderer.invoke('omp:getModels'),
  setModel: (provider: string, modelId: string) =>
    ipcRenderer.invoke('omp:setModel', provider, modelId),
  getSettings: () => ipcRenderer.invoke('omp:getSettings'),
  setSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke('omp:setSettings', patch),
  getProviders: () => ipcRenderer.invoke('omp:getProviders'),
  getProfiles: () => ipcRenderer.invoke('omp:getProfiles'),
  saveProfile: (p: Parameters<OmpApi['saveProfile']>[0]) => ipcRenderer.invoke('omp:saveProfile', p),
  deleteProfile: (id: string) => ipcRenderer.invoke('omp:deleteProfile', id),
  applyProfile: (id: string) => ipcRenderer.invoke('omp:applyProfile', id),
  getMcpServers: (workspace: string) => ipcRenderer.invoke('omp:getMcpServers', workspace),
  saveMcpServer: (name: string, server: McpServerDraft) =>
    ipcRenderer.invoke('omp:saveMcpServer', name, server),
  deleteMcpServer: (name: string) => ipcRenderer.invoke('omp:deleteMcpServer', name),
  setMcpEnabled: (name: string, enabled: boolean) =>
    ipcRenderer.invoke('omp:setMcpEnabled', name, enabled),
  getSkills: (workspace: string) => ipcRenderer.invoke('omp:getSkills', workspace),
  toggleSkill: (name: string, enabled: boolean) =>
    ipcRenderer.invoke('omp:toggleSkill', name, enabled),
  respondUi: (id: string, payload: UiResponsePayload) =>
    ipcRenderer.invoke('omp:respondUi', id, payload),
  setPinned: (filePath: string, pinned: boolean) =>
    ipcRenderer.invoke('omp:setPinned', filePath, pinned),
  getOmpLogs: (count: number) => ipcRenderer.invoke('omp:getOmpLogs', count),
  pickDirectory: () => ipcRenderer.invoke('omp:pickDirectory'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onEvent: (cb: (e: MainEvent) => void) => {
    const listener = (_e: unknown, ev: MainEvent): void => cb(ev)
    ipcRenderer.on('omp:event', listener)
    return () => ipcRenderer.removeListener('omp:event', listener)
  }
}

contextBridge.exposeInMainWorld('omp', api)
