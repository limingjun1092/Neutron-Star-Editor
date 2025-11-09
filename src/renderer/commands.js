// Lightweight command bridge so menu shortcuts work even if the full editor fails to load.
(function(){
  const state = {
    activeFilePath: null,
    openFiles: new Map()
  };

  // Ensure tabs container exists
  function createTabElement(filePath){
    // 规范化文件路径为统一的 key（使用正斜杠）
    const norm = String(filePath).replace(/\\\\/g, '/');
    const fileName = norm.split('/').pop();
    const tabsContainer = document.querySelector('.tabs-container');
    // 如果已经存在相同路径的标签，不再创建（避免与完整编辑器重复）
    const existing = document.querySelector(`.tab[data-file-path="${norm}"]`);
    if (existing) return existing;
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.filePath = norm;
    tab.innerHTML = `${fileName} <span class="tab-close">×</span>`;
    tab.addEventListener('click', ()=> setActiveFile(filePath));
    const closeBtn = tab.querySelector('.tab-close');
    if (closeBtn) closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); closeFile(filePath); });
    tabsContainer.appendChild(tab);
    return tab;
  }

  function setActiveFile(filePath){
    const norm = String(filePath).replace(/\\\\/g, '/');
    state.activeFilePath = norm;
    document.querySelectorAll('.tab').forEach(tab=>{
      tab.classList.toggle('active', tab.dataset.filePath===norm);
    });
    const fileInfo = state.openFiles.get(norm);
    const ta = ensurePlainEditor();
    if(fileInfo){
      ta.value = fileInfo.content;
      ta.style.display = 'block';
      document.querySelector('.editor-placeholder').style.display = 'none';
    }
    document.title = `${filePath.split(/[\\\/]/).pop()} - Neutron Star Editor`;
  }

  function closeFile(filePath){
    const norm = String(filePath).replace(/\\\\/g, '/');
    state.openFiles.delete(norm);
    // 移除所有匹配的标签（有时不同模块创建的路径格式可能不同）
    document.querySelectorAll(`.tab[data-file-path]`).forEach(tab=>{
      if(tab.dataset.filePath === norm || tab.dataset.filePath === filePath) tab.remove();
    });
    if(state.activeFilePath===norm){
      if(state.openFiles.size>0){
        setActiveFile(Array.from(state.openFiles.keys())[0]);
      } else {
        state.activeFilePath = null;
        const ta = ensurePlainEditor();
        ta.style.display = 'none';
        ta.value = '';
        document.querySelector('.editor-placeholder').style.display = 'flex';
        document.title = 'Neutron Star Editor';
      }
    }
  }

  function ensurePlainEditor(){
    let ta = document.getElementById('plain-editor');
    if(!ta){
      ta = document.createElement('textarea');
      ta.id = 'plain-editor';
      ta.style.position = 'absolute';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.width = '100%';
      ta.style.height = '100%';
      ta.style.background = 'transparent';
      ta.style.color = 'var(--text-primary)';
      ta.style.border = 'none';
      ta.style.padding = '16px';
      ta.style.boxSizing = 'border-box';
      ta.style.resize = 'none';
      ta.style.display = 'none';
      ta.style.zIndex = '1';
      const container = document.querySelector('.editor-container');
      container.appendChild(ta);
    }
    return ta;
  }

  // Handlers
  window.api && window.api.onCommand && window.api.onCommand('new-file', ()=>{
    const tempPath = `untitled-${Date.now()}.txt`;
    const norm = String(tempPath).replace(/\\/g, '/');
    state.openFiles.set(norm, { content: '' });
    createTabElement(norm);
    setActiveFile(norm);
    document.querySelector('.editor-placeholder').style.display = 'none';
  });

  window.api && window.api.onCommand && window.api.onCommand('open-file', async ()=>{
    const res = await window.api.showOpenDialog({ properties: ['openFile'] });
    if(!res.canceled && res.filePaths && res.filePaths.length>0){
  const path = res.filePaths[0];
  const r = await window.api.readFile(path);
  if(r.error){ alert('Error opening file: '+r.error); return; }
  const norm = String(path).replace(/\\/g, '/');
  state.openFiles.set(norm, { content: r.content });
  createTabElement(norm);
  setActiveFile(norm);
    }
  });

  // 打开文件夹并在侧边栏显示目录内容
  window.api && window.api.onCommand && window.api.onCommand('open-folder', async ()=>{
    const res = await window.api.showOpenDialog({ properties: ['openDirectory'] });
    if(!res || res.canceled || !res.filePaths || res.filePaths.length === 0) return;
    const dirPath = res.filePaths[0];
    // 展开侧边栏
    document.querySelector('.sidebar').classList.remove('collapsed');
    // 读取目录内容
    try {
      const entries = await window.api.readDirectory(dirPath);
      const tree = document.getElementById('file-tree');
      tree.innerHTML = '';
      // helper to create folder node
      function createFolderNode(entry) {
        const container = document.createElement('div');
        container.className = 'tree-folder';

        const header = document.createElement('div');
        header.className = 'tree-item';
        header.dataset.path = entry.path;

        const exp = document.createElement('span');
        exp.className = 'tree-item-icon';
        exp.textContent = '▸';
        exp.style.marginRight = '6px';
        exp.style.cursor = 'pointer';

  const icon = document.createElement('span');
  icon.className = 'tree-item-icon fa fa-folder';
  icon.style.marginRight = '6px';

        const name = document.createElement('span');
        name.textContent = entry.name;

        header.appendChild(exp);
        header.appendChild(icon);
        header.appendChild(name);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        childrenContainer.style.paddingLeft = '16px';
        childrenContainer.style.display = 'none';

        // expand/collapse handler
        async function toggle() {
          if (childrenContainer.style.display === 'none') {
            // expand: load children if not loaded
            if (!childrenContainer.dataset.loaded) {
              try {
                const sub = await window.api.readDirectory(entry.path);
                sub.forEach(subEntry => {
                  if (subEntry.isDirectory) {
                    const node = createFolderNode(subEntry);
                    childrenContainer.appendChild(node);
                  } else {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'tree-item';
                    fileItem.dataset.path = subEntry.path;
                    // Font Awesome 图标策略：优先使用明确映射，代码类无图标时回退到 fa fa-code，其他未知扩展显示文本图标
                    const ext = (subEntry.name.split('.').pop() || '').toLowerCase();
                    const filename = subEntry.name.toLowerCase();
                    const explicitMap = {
                      js: ['fa-brands','fa-js'], jsx: ['fa-brands','fa-react'],
                      ts: ['fa-brands','fa-js'], tsx: ['fa-brands','fa-react'],
                      html: ['fa-brands','fa-html5'], htm: ['fa-brands','fa-html5'],
                      css: ['fa-brands','fa-css3'],
                      py: ['fa-brands','fa-python'], java: ['fa-brands','fa-java'],
                      php: ['fa-brands','fa-php'], go: ['fa-brands','fa-golang'],
                      vue: ['fa-brands','fa-vuejs'],
                      json: ['fa-solid','fa-file-code'], xml: ['fa-solid','fa-file-code'],
                      yml: ['fa-solid','fa-file-code'], yaml: ['fa-solid','fa-file-code'],
                      md: ['fa-solid','fa-file-lines'], txt: ['fa-solid','fa-file-lines']
                    };
                    const codeLike = new Set(['js','jsx','ts','tsx','html','htm','css','py','java','c','cpp','h','php','go','rb','rs']);
                    let clsArr = explicitMap[ext] || null;
                    if (!clsArr) {
                      if (filename === 'license') clsArr = ['fa-solid','fa-id-card'];
                      else if (filename.startsWith('readme')) clsArr = ['fa-solid','fa-book'];
                      else if (filename.startsWith('package')) clsArr = ['fa-solid','fa-box'];
                    }
                    if (!clsArr) {
                      if (codeLike.has(ext)) {
                        // 代码类但没有专属图标，使用通用 code 图标（用户要求 fa fa-code）
                        clsArr = ['fa','fa-code'];
                      } else {
                        // 非代码类未知文件，使用文本图标
                        clsArr = ['fa-solid','fa-file-lines'];
                      }
                    }
                    const ficon = document.createElement('span');
                    ficon.className = 'tree-item-icon ' + clsArr.join(' ');
                    ficon.style.marginRight = '6px';
                    fileItem.appendChild(ficon);
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = subEntry.name;
                    fileItem.appendChild(nameSpan);
                    fileItem.addEventListener('click', async () => {
                      const r = await window.api.readFile(fileItem.dataset.path);
                      if (r && r.content !== undefined) {
                        const norm = String(fileItem.dataset.path).replace(/\\/g, '/');
                        state.openFiles.set(norm, { content: r.content });
                        createTabElement(norm);
                        setActiveFile(norm);
                      } else if (r && r.error) {
                        alert('Error opening file: '+r.error);
                      }
                    });
                    childrenContainer.appendChild(fileItem);
                  }
                });
                childrenContainer.dataset.loaded = '1';
              } catch (err) {
                console.error('Failed to read subdir', err);
              }
            }
            childrenContainer.style.display = 'block';
            exp.textContent = '▾';
          } else {
            childrenContainer.style.display = 'none';
            exp.textContent = '▸';
          }
        }

        // click header toggles
        header.addEventListener('click', (ev)=>{
          // avoid clicking triggering other handlers
          ev.stopPropagation();
          toggle();
        });

        container.appendChild(header);
        container.appendChild(childrenContainer);
        return container;
      }

      // top-level entries
      entries.forEach(entry => {
        if (entry.isDirectory) {
          const folderNode = createFolderNode(entry);
          tree.appendChild(folderNode);
        } else {
          const item = document.createElement('div');
          item.className = 'tree-item';
          item.dataset.path = entry.path;
          // Font Awesome 图标映射（文件名优先）
          // 图标类型映射
          // 图标策略：明确映射、代码类回退为 fa fa-code、其他未知为文本图标
          const name = entry.name.toLowerCase();
          const ext = (name.split('.').pop() || '').toLowerCase();
          const explicitMap = {
            js: ['fa-brands','fa-js'], jsx: ['fa-brands','fa-react'],
            ts: ['fa-brands','fa-js'], tsx: ['fa-brands','fa-react'],
            html: ['fa-brands','fa-html5'], htm: ['fa-brands','fa-html5'],
            css: ['fa-brands','fa-css3'],
            py: ['fa-brands','fa-python'], java: ['fa-brands','fa-java'],
            php: ['fa-brands','fa-php'], go: ['fa-brands','fa-golang'],
            vue: ['fa-brands','fa-vuejs'],
            json: ['fa-solid','fa-file-code'], xml: ['fa-solid','fa-file-code'],
            yml: ['fa-solid','fa-file-code'], yaml: ['fa-solid','fa-file-code'],
            md: ['fa-solid','fa-file-lines'], txt: ['fa-solid','fa-file-lines']
          };
          const codeLike = new Set(['js','jsx','ts','tsx','html','htm','css','py','java','c','cpp','h','php','go','rb','rs']);
          let clsArr = explicitMap[ext] || null;
          if (!clsArr) {
            if (name === 'license') clsArr = ['fa-solid','fa-id-card'];
            else if (name.startsWith('readme')) clsArr = ['fa-solid','fa-book'];
            else if (name.startsWith('package')) clsArr = ['fa-solid','fa-box'];
          }
          if (!clsArr) {
            if (codeLike.has(ext)) clsArr = ['fa','fa-code'];
            else clsArr = ['fa-solid','fa-file-lines'];
          }
          const icon = document.createElement('span');
          icon.className = 'tree-item-icon ' + clsArr.join(' ');
          icon.style.marginRight = '6px';
          item.appendChild(icon);
          const nameSpan = document.createElement('span');
          nameSpan.textContent = entry.name;
          item.appendChild(nameSpan);
                    item.addEventListener('click', async () => {
            const r = await window.api.readFile(item.dataset.path);
            if (r && r.content !== undefined) {
              const norm = String(item.dataset.path).replace(/\\/g, '/');
              state.openFiles.set(norm, { content: r.content });
              createTabElement(norm);
              setActiveFile(norm);
            } else if (r && r.error) {
              alert('Error opening file: '+r.error);
            }
          });
          tree.appendChild(item);
        }
      });
    } catch (e) {
      console.error('Error reading directory', e);
      alert('Error reading directory: '+(e && e.message ? e.message : e));
    }
  });

  window.api && window.api.onCommand && window.api.onCommand('save-file', async ()=>{
    if(!state.activeFilePath) return;
    const ta = ensurePlainEditor();
    const content = ta.value;
    const r = await window.api.writeFile({ filePath: state.activeFilePath, content });
    if(r && r.error) alert('Save error: '+r.error); else console.log('Saved', state.activeFilePath);
  });

  window.api && window.api.onCommand && window.api.onCommand('save-file-as', async ()=>{
    const res = await window.api.showSaveDialog({ title: 'Save File As', defaultPath: state.activeFilePath || '' });
        if(!res.canceled && res.filePath){
      const ta = ensurePlainEditor();
      const content = ta.value;
      const wr = await window.api.writeFile({ filePath: res.filePath, content });
      if(wr && wr.error) alert('Save error: '+wr.error); else {
        const norm = String(res.filePath).replace(/\\/g, '/');
        state.openFiles.set(norm, { content });
        createTabElement(norm);
        setActiveFile(norm);
      }
    }
  });

  window.api && window.api.onCommand && window.api.onCommand('toggle-sidebar', ()=>{
    document.querySelector('.sidebar').classList.toggle('collapsed');
  });

  window.api && window.api.onCommand && window.api.onCommand('toggle-fullscreen', ()=>{
    window.api.toggleFullscreen && window.api.toggleFullscreen();
  });

  // Translation application for basic HTML UI (fallback)
  async function applyTranslations(locale) {
    if (!window.api || !window.api.loadLocale) return;
    const res = await window.api.loadLocale(locale);
    if (res && res.data) {
      const t = (k, f) => res.data[k] || f || k;
      try {
        document.getElementById('app-title').textContent = t('app.title', 'Neutron Star Editor');
        const ph = document.querySelector('.editor-placeholder h2');
        if (ph) ph.textContent = t('placeholder.title', 'Neutron Star Editor');
        const pp = document.querySelector('.editor-placeholder p');
        if (pp) pp.textContent = t('placeholder.text', 'Open a file or folder to get started');
        const sh = document.querySelector('.sidebar-header h3');
        if (sh) sh.textContent = t('sidebar.project', 'Project');
        const se = document.getElementById('status-encoding');
        if (se) se.textContent = t('status.encoding', 'UTF-8');
        const si = document.getElementById('status-indentation');
        if (si) si.textContent = t('status.indentation', 'Spaces: 2');
        const sl = document.getElementById('status-language');
        if (sl) sl.textContent = t('status.language', 'Plain Text');
        // set selector
        const sel = document.getElementById('lang-select');
        if (sel) sel.value = locale;
      } catch (e) {
        console.error('applyTranslations error', e);
      }
    }
  }

  // Hook up language selector (fallback) to apply translations and notify main process
  try {
    const sel = document.getElementById('lang-select');
    if (sel) {
      sel.removeAttribute('onchange');
      sel.addEventListener('change', async (e) => {
        const v = e.target.value;
        // apply translations to HTML
        await applyTranslations(v);
        // notify main process to rebuild menu
        if (window.api && window.api.setLocale) {
          const r = await window.api.setLocale(v);
          if (r && r.error) {
            console.error('setLocale error', r.error);
          }
        }
        // feedback in overlay
        const overlay = document.getElementById('debug-overlay');
        if (overlay) {
          const prev = overlay.textContent;
          overlay.textContent = `Locale switched: ${v}`;
          setTimeout(()=>{ overlay.textContent = prev; }, 2000);
        }
      });
    }
  } catch (e) { /* ignore if DOM not ready */ }

  // Apply initial locale from localStorage (fallback zh-cn)
  (async function(){
    const initLocale = (typeof localStorage !== 'undefined' && localStorage.getItem('appLocale')) || 'zh-cn';
    await applyTranslations(initLocale);
    // notify main process to ensure menu matches initial locale
    if (window.api && window.api.setLocale) {
      try { await window.api.setLocale(initLocale); } catch(e) { /* ignore */ }
    }
  })();

})();
