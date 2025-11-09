const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { setupMainMenu } = require('./menu');
const { createMainWindow } = require('./window');

// 保持对主窗口的全局引用
let mainWindow = null;

// 应用就绪后创建窗口
app.whenReady().then(() => {
  mainWindow = createMainWindow();
  // 当窗口被关闭时，清理主进程保存的引用
  if (mainWindow) {
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }
  setupMainMenu(mainWindow);
  
  // 开发环境下自动刷新和打开 DevTools
  if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '../../node_modules', '.bin', 'electron')
    });
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.openDevTools();
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

// 窗口全部关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
// 在开发环境下开启 DevTools（仅在窗口创建后）
// 请不要在模块顶层直接访问 mainWindow（可能为 null）
// 文件操作IPC处理
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return { content: await fs.readFile(filePath, 'utf8') };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('write-file', async (event, { filePath, content }) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name)
    }));
  } catch (err) {
    return { error: err.message };
  }
});

// 对话框处理
ipcMain.handle('show-open-dialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

// 运行时切换语言：重建菜单
ipcMain.handle('set-locale', async (event, locale) => {
  try {
    // 将首选项放入环境变量，便于后续启动使用
    process.env.APP_LOCALE = locale;
    setupMainMenu(mainWindow, locale);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

// 窗口控制
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('toggle-dev-tools', () => {
  if (mainWindow) {
    mainWindow.webContents.toggleDevTools();
  }
});