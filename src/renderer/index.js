import { EditorView, basicSetup } from 'codemirror';
import { defaultTabBinding } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { go } from '@codemirror/lang-go';
import { cpp } from '@codemirror/lang-cpp';
import { LanguageSupport } from '@codemirror/language';

// 全局状态管理
const state = {
  activeFilePath: null,
  openFiles: new Map(), // filePath -> { content, language }
  sidebarVisible: true,
  autoSave: false
};
// （已在顶部定义 languageModes，这里删除重复定义）

// i18n 翻译对象
let translations = {};
function t(key, fallback) {
  return translations[key] || fallback || key;
}

// 初始化编辑器
let editor;

// 规范化文件路径为统一格式（正斜杠）
function normPath(p){
  return String(p).replace(/\\\\/g, '/');
}

function initEditor() {
  editor = new EditorView({
    doc: '',
    extensions: [
      basicSetup,
      oneDark,
      defaultTabBinding,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && state.autoSave && state.activeFilePath) {
          saveFile();
        }
      })
    ],
    parent: document.getElementById('editor')
  });
  // 初始更新状态栏（简单的初期赋值）
  try { updateStatusLineCol(); } catch (e) { /* ignore if editor not ready */ }
}

// 语言名称映射（只用于显示语言名）
const languageModes = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.py': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C/C++'
};

// 根据文件路径获取语言名称（显示用）
function getLanguageMode(filePath) {
  const idx = filePath.lastIndexOf('.');
  if (idx === -1) return null;
  const ext = filePath.slice(idx);
  return languageModes[ext] || null;
}

// 更新状态栏行列信息
function updateStatusLineCol() {
  try {
    const pos = editor.state.selection.main.head;
    const line = editor.state.doc.lineAt(pos);
    const lineNum = line.number;
    const colNum = pos - line.from + 1;
    document.getElementById('status-line-col').textContent = `Ln ${lineNum}, Col ${colNum}`;
  } catch (e) {
    // ignore when editor not ready
  }
}

// 打开文件
async function openFile(filePath) {
  try {
    // 检查文件是否已打开
        const norm = normPath(filePath);
    if (state.openFiles.has(norm)) {
      // 切换到已打开的标签
      setActiveFile(norm);
      return;
    }

    // 读取文件内容
    const result = await window.api.readFile(filePath);
    if (result.error) {
      alert(`Error opening file: ${result.error}`);
      return;
    }

    // 先检测编码和语言，后统一存储文件信息

    // 检测编码（简单判断，实际可扩展为API返回encoding）
    let encoding = 'UTF-8';
    if (result.encoding) {
      encoding = result.encoding;
    } else if (/gb2312|gbk/i.test(result.content)) {
      encoding = 'GB2312';
    }
    // 确定语言模式
    const language = getLanguageMode(filePath);
    // 存储文件信息（使用规范化路径作为 key）
    state.openFiles.set(norm, {
      content: result.content,
      language,
      encoding
    });
    // 创建标签并切换到该文件
    createTab(norm);
    setActiveFile(norm);
    // 隐藏占位符（如果有）
    const ph = document.querySelector('.editor-placeholder');
    if (ph) ph.style.display = 'none';
  } catch (err) {
    console.error('Error opening file:', err);
    alert(`Error opening file: ${err.message}`);
  }
}

// 创建标签
function createTab(filePath) {
  const norm = normPath(filePath);
  const fileName = norm.split(/[\/]/).pop();
  const tabsContainer = document.querySelector('.tabs-container');
  // 如果已存在同一路径的标签，不重复创建
  const existing = document.querySelector(`.tab[data-file-path="${norm}"]`);
  if (existing) return existing;
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.filePath = norm;
  tab.innerHTML = `
    ${fileName}
    <span class="tab-close">×</span>
  `;
  
  // 标签点击事件
  tab.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) {
      setActiveFile(norm);
    }
  });
  
  // 关闭按钮事件
  const closeBtn = tab.querySelector('.tab-close');
  if (closeBtn) closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeFile(norm);
  });
  
  tabsContainer.appendChild(tab);
  return tab;
}

// 设置活动文件
function setActiveFile(filePath) {
  // 更新状态
  state.activeFilePath = normPath(filePath);
  
  // 更新标签样式
  document.querySelectorAll('.tab').forEach(tab => {
    if (tab.dataset.filePath === state.activeFilePath) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // 获取文件信息
  const fileInfo = state.openFiles.get(state.activeFilePath);
  if (!fileInfo) return;
  
  // 更新编辑器内容（使用 dispatch 替换全部文本）
  // 动态显示编码
  document.getElementById('status-encoding').textContent = fileInfo.encoding || 'UTF-8';
  try {
    const prevLen = editor.state.doc.length;
    editor.dispatch({ changes: { from: 0, to: prevLen, insert: fileInfo.content }, selection: { anchor: 0 } });
  } catch (e) {
    console.error('Failed to set editor content', e);
  }

  // 更新语言显示（仅显示语言名）
  if (fileInfo.language) {
    document.getElementById('status-language').textContent = fileInfo.language;
  } else {
    document.getElementById('status-language').textContent = 'Plain Text';
  }
  
  // 更新标题（包含应用名）
  document.title = `${filePath.split(/[\/]/).pop()} - ${t('app.title', 'Neutron Star Editor')}`;
}

// 获取语言名称
function getLanguageName(language) {
  const langMap = new Map([
    [javascript(), 'JavaScript'],
    [html(), 'HTML'],
    [css(), 'CSS'],
    [python(), 'Python'],
    [java(), 'Java'],
    [go(), 'Go'],
    [cpp(), 'C++']
  ]);
  
  return langMap.get(language) || 'Plain Text';
}

// 关闭文件
function closeFile(filePath) {
  // 从状态中移除（使用规范化路径）
  const norm = normPath(filePath);
  state.openFiles.delete(norm);
  // 移除所有匹配的标签（兼容不同路径格式）
  document.querySelectorAll('.tab[data-file-path]').forEach(tab=>{
    if(tab.dataset.filePath === norm || tab.dataset.filePath === filePath) tab.remove();
  });
  
  // 如果关闭的是活动文件，切换到第一个打开的文件
  if (state.activeFilePath === filePath) {
    if (state.openFiles.size > 0) {
      const firstFilePath = Array.from(state.openFiles.keys())[0];
      setActiveFile(firstFilePath);
    } else {
      // 没有打开的文件，显示占位符
      state.activeFilePath = null;
      try { editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: '' } }); } catch (e) {}
      document.querySelector('.editor-placeholder').style.display = 'flex';
      document.title = t('app.title', 'Neutron Star Editor');
    }
  }
}

// 保存文件
async function saveFile() {
  if (!state.activeFilePath) return;
  
  try {
    const content = editor.state.doc.toString();
    
    // 更新状态中的内容
    const fileInfo = state.openFiles.get(state.activeFilePath);
    if (fileInfo) {
      fileInfo.content = content;
    }
    
    // 写入文件
    const result = await window.api.writeFile({
      filePath: state.activeFilePath,
      content
    });
    
    if (result.error) {
      alert(`Error saving file: ${result.error}`);
    } else {
      // 可以在这里添加一个保存成功的指示器
      console.log('File saved successfully');
    }
  } catch (err) {
    console.error('Error saving file:', err);
    alert(`Error saving file: ${err.message}`);
  }
}

// 保存文件为
  // 监听光标变化，动态更新行列
  editor.dom.addEventListener('keyup', updateStatusLineCol);
  editor.dom.addEventListener('click', updateStatusLineCol);
async function saveFileAs() {
  try {
    const result = await window.api.showSaveDialog({
      title: 'Save File As',
      defaultPath: state.activeFilePath || ''
    });
    
    if (!result.canceled && result.filePath) {
      const newFilePath = result.filePath;
      const content = editor.state.doc.toString();
      
      // 写入新文件
      const writeResult = await window.api.writeFile({
        filePath: newFilePath,
        content
      });
      
      if (writeResult.error) {
        alert(`Error saving file: ${writeResult.error}`);
        return;
      }
      
      // 如果是新文件，添加到打开的文件列表
      if (!state.activeFilePath) {
        const language = getLanguageMode(newFilePath);
        state.openFiles.set(newFilePath, { content, language });
        createTab(newFilePath);
      } else {
        // 如果是另存为，从原文件迁移
        const oldFilePath = state.activeFilePath;
        const fileInfo = state.openFiles.get(oldFilePath);
        
        // 移除旧文件
        state.openFiles.delete(oldFilePath);
        const oldTab = document.querySelector(`.tab[data-file-path="${oldFilePath}"]`);
        if (oldTab) oldTab.remove();
        
        // 添加新文件
        state.openFiles.set(newFilePath, { ...fileInfo, content });
        createTab(newFilePath);
      }
      
      // 设置新文件为活动文件
      setActiveFile(newFilePath);
    }
  } catch (err) {
    console.error('Error saving file as:', err);
    alert(`Error saving file: ${err.message}`);
  }
}

// 切换侧边栏
function toggleSidebar() {
  state.sidebarVisible = !state.sidebarVisible;
  document.querySelector('.sidebar').classList.toggle('collapsed', !state.sidebarVisible);
}

// 初始化事件监听
function initEventListeners() {
  // 查找弹窗
  window.api.onCommand('find', () => {
    showFindReplaceDialog('find');
  });
  window.api.onCommand('replace', () => {
    showFindReplaceDialog('replace');
  });
  // 自动保存切换
  window.api.onCommand('auto-save-toggle', (enabled) => {
    state.autoSave = !!enabled;
    // 可在 UI 显示提示
    const overlay = document.getElementById('debug-overlay');
    if (overlay) {
      overlay.textContent = enabled ? 'Auto Save: ON' : 'Auto Save: OFF';
      setTimeout(()=>{ overlay.textContent = 'debug overlay'; }, 2000);
    }
  });
  // 命令监听
  window.api.onCommand('new-file', () => {
    // 实现新建文件逻辑
    const tempPath = `untitled-${Date.now()}.txt`;
    const normTemp = normPath(tempPath);
    state.openFiles.set(normTemp, { content: '', language: null });
    createTab(normTemp);
    setActiveFile(normTemp);
    document.querySelector('.editor-placeholder').style.display = 'none';
  });
  
  window.api.onCommand('open-file', async () => {
    const result = await window.api.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'JavaScript', extensions: ['js', 'jsx', 'ts', 'tsx'] },
        { name: 'HTML', extensions: ['html', 'htm'] },
        { name: 'CSS', extensions: ['css'] },
        { name: 'Python', extensions: ['py'] },
        { name: 'Java', extensions: ['java'] },
        { name: 'Go', extensions: ['go'] },
        { name: 'C/C++', extensions: ['c', 'cpp', 'h'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      openFile(result.filePaths[0]);
    }
  });
  
  window.api.onCommand('save-file', saveFile);
  window.api.onCommand('save-file-as', saveFileAs);
  window.api.onCommand('toggle-sidebar', toggleSidebar);
  window.api.onCommand('toggle-fullscreen', () => {
    window.api.toggleFullscreen();
  });
  
  // 侧边栏按钮
  document.getElementById('sidebar-close-btn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-toggle-btn').addEventListener('click', () => {
    // 这里可以实现刷新文件树的逻辑
    console.log('Refresh file tree');
  });
}

// 加载并应用翻译
async function loadTranslations(locale) {
  const useLocale = locale || localStorage.getItem('appLocale') || 'zh-cn';
  const res = await window.api.loadLocale(useLocale);
  if (res && res.data) {
    translations = res.data;
  } else {
    translations = {};
  }

  // 应用到 UI
  try {
    document.getElementById('app-title').textContent = t('app.title', 'Neutron Star Editor');
    document.querySelector('.editor-placeholder h2').textContent = t('placeholder.title', 'Neutron Star Editor');
    document.querySelector('.editor-placeholder p').textContent = t('placeholder.text', 'Open a file or folder to get started');
    document.querySelector('.sidebar-header h3').textContent = t('sidebar.project', 'Project');
    document.getElementById('status-encoding').textContent = t('status.encoding', 'UTF-8');
    document.getElementById('status-indentation').textContent = t('status.indentation', 'Spaces: 2');
  } catch (e) {
    // ignore if elements not present yet
  }

  // 保存到 localStorage
  localStorage.setItem('appLocale', useLocale);
  // 设置选择器
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = useLocale;
}

// 初始化应用
function initApp() {
  // 创建查找/替换弹窗
  function createFindReplaceDialog() {
    if (document.getElementById('find-replace-dialog')) return;
    const dialog = document.createElement('div');
    dialog.id = 'find-replace-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '60px';
    dialog.style.right = '30px';
    dialog.style.background = '#222';
    dialog.style.color = '#fff';
    dialog.style.padding = '16px 20px';
    dialog.style.borderRadius = '8px';
    dialog.style.zIndex = '9999';
    dialog.style.boxShadow = '0 2px 8px #0008';
    dialog.style.display = 'none';
    dialog.innerHTML = `
      <div style="margin-bottom:8px;">
        <input id="find-input" type="text" placeholder="查找..." style="width:180px; margin-right:8px;">
        <input id="replace-input" type="text" placeholder="替换..." style="width:180px;">
      </div>
      <div style="display:flex; gap:8px;">
        <button id="find-btn">查找</button>
        <button id="replace-btn">替换</button>
        <button id="close-find-replace">关闭</button>
      </div>
    `;
    document.body.appendChild(dialog);
    document.getElementById('close-find-replace').onclick = () => {
      dialog.style.display = 'none';
    };
    document.getElementById('find-btn').onclick = () => {
      const val = document.getElementById('find-input').value;
      if (!val) return;
      const doc = editor.state.doc.toString();
      const idx = doc.indexOf(val);
      if (idx >= 0) {
        editor.dispatch({ selection: { anchor: idx, head: idx + val.length } });
      }
    };
    document.getElementById('replace-btn').onclick = () => {
      const findVal = document.getElementById('find-input').value;
      const replaceVal = document.getElementById('replace-input').value;
      if (!findVal) return;
      const doc = editor.state.doc.toString();
      const idx = doc.indexOf(findVal);
      if (idx >= 0) {
        editor.dispatch({ changes: { from: idx, to: idx + findVal.length, insert: replaceVal } });
        editor.dispatch({ selection: { anchor: idx, head: idx + replaceVal.length } });
      }
    };
  }
  window.showFindReplaceDialog = function(mode) {
    createFindReplaceDialog();
    const dialog = document.getElementById('find-replace-dialog');
    dialog.style.display = 'block';
    document.getElementById('replace-input').style.display = (mode === 'replace') ? 'inline-block' : 'none';
  };

  // 初始化编辑器和事件监听
  initEditor();
  initEventListeners();

  // 默认加载语言
  loadTranslations(localStorage.getItem('appLocale') || 'zh-cn');

  // 语言切换监听
  const sel = document.getElementById('lang-select');
  if (sel) {
    sel.addEventListener('change', (e) => {
      const v = e.target.value;
      loadTranslations(v);
    });
  }

}

// 启动应用
initApp();