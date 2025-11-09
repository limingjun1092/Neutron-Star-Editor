const { BrowserWindow } = require('electron');
const path = require('path');

exports.createMainWindow = () => {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Neutron Star Editor',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#1a1a1a',
    show: false, // 先隐藏，等加载完成再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '../common/preload.js'),
      spellcheck: true,
      devTools: process.env.NODE_ENV === 'development'
    }
  });

  // 加载主页面
  mainWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

  // 窗口准备好后再显示，避免白屏
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // 窗口关闭时的清理（不要重新给常量赋值，主进程应负责管理引用）
  mainWindow.on('closed', () => {
    // 这里不对 local 常量重新赋值；如果主进程需要清理引用，
    // 应在创建窗口的地方监听并清理全局引用（main.js）。
  });

  return mainWindow;
};