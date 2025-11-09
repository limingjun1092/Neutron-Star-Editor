const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 本地 locale 存放目录（相对于 src/common -> ../renderer/locales）
const localesDir = path.join(__dirname, '..', 'renderer', 'locales');

contextBridge.exposeInMainWorld('api', {
  // 文件操作
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (opts) => ipcRenderer.invoke('write-file', opts),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  showOpenDialog: (opts) => ipcRenderer.invoke('show-open-dialog', opts),
  showSaveDialog: (opts) => ipcRenderer.invoke('show-save-dialog', opts),
  // 窗口控制
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),
  // 菜单命令监听（来自主进程的 webContents.send）
  onCommand: (command, callback) => {
    ipcRenderer.on(`command:${command}`, (event, ...args) => callback(...args));
  },
  // i18n: 从磁盘加载 locale JSON（同步返回 Promise）
  loadLocale: async (locale) => {
    try {
      const localeFile = path.join(localesDir, `${locale}.json`);
      const raw = await fs.promises.readFile(localeFile, 'utf8');
      return { data: JSON.parse(raw) };
    } catch (err) {
      return { error: err.message };
    }
  }
  ,
  // 请求主进程切换应用语言（主进程会重建菜单）
  setLocale: async (locale) => {
    return await ipcRenderer.invoke('set-locale', locale);
  }
});
