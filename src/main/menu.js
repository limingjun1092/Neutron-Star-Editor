const { Menu, app } = require('electron');
const fs = require('fs');
const path = require('path');

exports.setupMainMenu = (mainWindow, locale) => {
  // 尝试加载指定语言的翻译文件，默认 zh-cn
  const useLocale = locale || process.env.APP_LOCALE || 'zh-cn';
  let translations = {};
  try {
    const localePath = path.join(__dirname, '..', 'renderer', 'locales', `${useLocale}.json`);
    translations = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  } catch (err) {
    translations = {};
  }

  function t(key, fallback) {
    return translations[key] || fallback || key;
  }

  const template = [
    {
      label: t('menu.file', 'File'),
      submenu: [
        {
          label: t('menu.autoSave', 'Auto Save'),
          type: 'checkbox',
          checked: global.autoSaveEnabled || false,
          click: (menuItem) => {
            global.autoSaveEnabled = menuItem.checked;
            mainWindow.webContents.send('command:auto-save-toggle', menuItem.checked);
          }
        },
        {
          label: t('menu.newFile', 'New File'),
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('command:new-file')
        },
        {
          label: t('menu.newWindow', 'New Window'),
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            const { createMainWindow } = require('./window');
            createMainWindow();
          }
        },
        { type: 'separator' },
        {
          label: t('menu.openFile', 'Open File'),
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('command:open-file')
        },
        {
          label: t('menu.openFolder', 'Open Folder'),
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow.webContents.send('command:open-folder')
        },
        { type: 'separator' },
        {
          label: t('menu.save', 'Save'),
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('command:save-file')
        },
        {
          label: t('menu.saveAs', 'Save As'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('command:save-file-as')
        },
        { type: 'separator' },
        {
          label: t('menu.exit', 'Exit'),
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            if (process.platform !== 'darwin') {
              app.quit();
            }
          }
        }
      ]
    },
    {
      label: t('menu.edit', 'Edit'),
      submenu: [
        { label: t('menu.undo', 'Undo'), accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: t('menu.redo', 'Redo'), accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: t('menu.cut', 'Cut'), accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: t('menu.copy', 'Copy'), accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: t('menu.paste', 'Paste'), accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: t('menu.selectAll', 'Select All'), accelerator: 'CmdOrCtrl+A', role: 'selectall' },
        { type: 'separator' },
        {
          label: t('menu.find', 'Find'),
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('command:find')
        },
        {
          label: t('menu.replace', 'Replace'),
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow.webContents.send('command:replace')
        }
      ]
    },
    {
      label: t('menu.view', 'View'),
      submenu: [
        {
          label: t('menu.toggleSidebar', 'Toggle Sidebar'),
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('command:toggle-sidebar')
        },
        {
          label: t('menu.toggleFullScreen', 'Toggle Full Screen'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
          click: () => mainWindow.webContents.send('command:toggle-fullscreen')
        },
        { type: 'separator' },
        
        {
          label: t('menu.toggleDevTools', 'Toggle Developer Tools'),
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: t('menu.about', '关于'),
      submenu: [
        {
          label: t('menu.about', '关于'),
          click: () => mainWindow.webContents.send('command:show-about')
        }
      ]
    }
  ];

  // macOS特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: 'Neutron Star Editor',
      submenu: [
        { label: 'About Neutron Star Editor', role: 'about' },
        { type: 'separator' },
        { label: 'Services', role: 'services' },
        { type: 'separator' },
        { label: 'Hide Neutron Star Editor', accelerator: 'Command+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideOthers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};