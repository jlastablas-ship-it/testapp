
        let db, state;

        db = new Dexie("AppDB_V3"); 
        db.version(3).stores({
            settings: "key, value",
            bookmarks: "++id, url, title"
        });

        state = {
            activeWindows: [],
            focusedWindowId: null,
            internalOpen: { db: false, config: false },
            selectedDomNodes: new Set(),
            darkMode: false
        };

        const ICONS = {
            web: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
            module: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
            db: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
            config: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
        };

        // Initialize Theme
        async function initTheme() {
            const savedTheme = await db.settings.get('darkMode');
            if (savedTheme && savedTheme.value) {
                toggleDarkMode(true);
            }
        }

        async function toggleDarkMode(isInit = false) {
            state.darkMode = isInit ? true : !state.darkMode;
            if (state.darkMode) {
                $('#app-body').addClass('dark-mode');
            } else {
                $('#app-body').removeClass('dark-mode');
            }
            await db.settings.put({ key: 'darkMode', value: state.darkMode });
            if (state.focusedWindowId && $(`#${state.focusedWindowId}`).data('type') === 'config') {
                renderConfig(state.focusedWindowId);
            }
        }

        async function openInternalWindow(type) {
            if (state.internalOpen[type]) return;
            state.internalOpen[type] = true;
            updateSystemNavButtons();
            createWindowCard(type === 'db' ? 'Database' : 'Settings', null, type);
        }

        function createWindowCard(title, content, type = 'module') {
            const windowId = `win-${Date.now()}`;
            const isInternal = type === 'db' || type === 'config';
            
            // Resolve relative path if content is not a full URL and not internal
            let resolvedUrl = content;
            if (!isInternal && content) {
                const isAbsolute = /^https?:\/\//i.test(content) || content.startsWith('data:') || content.startsWith('blob:');
                if (!isAbsolute) {
                    try {
                        // FIX: Detect if we are in a blob environment or sandbox
                        let base = window.location.href;
                        if (base.startsWith('blob:')) {
                            // If base is a blob, we can't easily resolve relative paths against it for external assets
                            // unless we use the origin. But usually relative assets work if the browser handles it.
                            // We try to use URL constructor safely.
                            resolvedUrl = new URL(content, window.location.origin).href;
                        } else {
                            resolvedUrl = new URL(content, base).href;
                        }
                    } catch(e) {
                        console.error("Error resolving path:", e);
                        // Fallback: Just use the content as is
                        resolvedUrl = content;
                    }
                }
            }

            const cardHtml = 
                `
                <div id="${windowId}" class="window-card" data-type="${type}" onclick="focusWindow('${windowId}')">
                    <div class="window-header">
                        <span class="text-[10px] font-bold truncate opacity-80 uppercase mr-4">${title}</span>
                        <div class="flex items-center gap-1">
                            <button onclick="toggleMinimize('${windowId}')" class="btn-win-tool" title="Minimizar">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
                            </button>
                            <button onclick="toggleMaximize('${windowId}')" class="btn-win-tool" title="Maximizar">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
                            </button>
                            <button onclick="toggleFullScreen('${windowId}')" class="btn-win-tool" title="Full Screen">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                            </button>
                            <button onclick="removeWindow('${windowId}', '${type}')" class="btn-win-tool text-red-500 ml-1" title="Cerrar">✕</button>
                        </div>
                    </div>
                    <div class="window-body">
                        <div class="iframe-overlay"></div>
                        ${isInternal ? 
                            `<div id="content-${windowId}" class="p-4 h-full overflow-auto bg-white text-xs font-mono"></div>` : 
                            `<iframe id="iframe-${windowId}" src="${resolvedUrl}" onload="inspectIframe('${windowId}')" onerror="handleIframeError('${windowId}')"></iframe>`
                        }
                    </div>
                </div>
                `
            ;
                 
            
            $('#main').append(cardHtml);
            const win = $(`#${windowId}`);
            win.css({ top: (50 + state.activeWindows.length * 20) + 'px', left: (50 + state.activeWindows.length * 20) + 'px' });
            
            win.draggable({ 
                handle: ".window-header", 
                containment: "#main", 
                stack: ".window-card",
                start: () => win.hasClass('window-maximized') ? false : true
            }).resizable({
                start: () => (win.hasClass('window-maximized') || win.hasClass('window-minimized')) ? false : true
            });
            
            state.activeWindows.push({ id: windowId, title: title, type: type, url: resolvedUrl });
            updateWindowsNav();
            focusWindow(windowId);
            
            if (type === 'db') renderDB(windowId);
            if (type === 'config') renderConfig(windowId);
        }

        function handleIframeError(id) {
            console.error("Iframe failed to load:", id);
        }

        // --- WINDOW MANAGEMENT ACTIONS ---

        function toggleMaximize(id) {
            const win = $(`#${id}`);
            win.removeClass('window-minimized');
            win.toggleClass('window-maximized');
            
            if (win.hasClass('window-maximized')) {
                win.draggable('disable');
            } else {
                win.draggable('enable');
            }
        }

        function toggleMinimize(id) {
            const win = $(`#${id}`);
            win.removeClass('window-maximized').draggable('enable');
            win.toggleClass('window-minimized');
        }

        function toggleFullScreen(id) {
            const elem = document.getElementById(id);
            if (!document.fullscreenElement) {
                elem.requestFullscreen().catch(err => console.error(err));
            } else {
                document.exitFullscreen();
            }
        }

        // --- BOOKMARKS LOGIC ---

        async function autoloadBookmarks() {
            const all = await db.bookmarks.toArray();
            if (all.length === 0) return;
            all.forEach((bm, index) => {
                setTimeout(() => {
                    createWindowCard(bm.title, bm.url, 'web');
                }, index * 150);
            });
        }

        async function addBookmark() {
            const title = document.getElementById('bm-title').value;
            const url = document.getElementById('bm-url').value;
            if (!title || !url) return;
            
            let finalUrl = url;
            // Only prepend https if it's not a relative path and doesn't have a protocol
            const isRelative = url.startsWith('.') || url.startsWith('/');
            const hasProtocol = /^https?:\/\//i.test(url) || url.startsWith('blob:');
            
            if(!isRelative && !hasProtocol) {
                finalUrl = 'https://' + finalUrl;
            }

            await db.bookmarks.add({ title, url: finalUrl });
            document.getElementById('bm-title').value = '';
            document.getElementById('bm-url').value = '';
            renderConfig(state.focusedWindowId);
        }

        async function deleteBookmark(id) {
            await db.bookmarks.delete(id);
            renderConfig(state.focusedWindowId);
        }

        // --- INSPECTOR CORE ---

        function switchInsTab(btn, tabId) {
            const container = $(btn).closest('.ins-tabs-container');
            container.find('.ins-tab-btn').removeClass('active text-blue-600 border-blue-600').addClass('text-gray-400 border-transparent');
            $(btn).addClass('active text-blue-600 border-blue-600');
            
            container.find('.ins-tab-content').removeClass('active');
            container.find(`.ins-tab-content[data-tab="${tabId}"]`).addClass('active');
        }

        function toggleInsItem(header) {
            $(header).next('.ins-item-body').toggleClass('hidden');
            const icon = $(header).find('.toggle-icon-item');
            icon.text(icon.text() === '▼' ? '▶' : '▼');
        }

        function renderElementInspector(title, htmlContent, idPrefix) {
            const escaped = escapeHtml(htmlContent);
            const previewBlob = `
                <html>
                    <head>
                        <script src="https://cdn.tailwindcss.com"><\/script>
                        <style>body{padding:10px;font-family:sans-serif;background-image:radial-gradient(#eee 1px, transparent 1px);background-size:10px 10px;}<\/style>
                    </head>
                    <body>${htmlContent}</body>
                </html>
            `;

            return `
                <div class="border border-gray-200 rounded-md mb-2 overflow-hidden shadow-sm">
                    <div class="bg-gray-100 p-2 flex justify-between items-center cursor-pointer hover:bg-gray-200" onclick="toggleInsItem(this)">
                        <span class="text-[9px] font-bold text-gray-600 uppercase truncate">${title}</span>
                        <span class="toggle-icon-item text-[8px]">▶</span>
                    </div>
                    <div class="ins-item-body hidden p-2 bg-white ins-tabs-container">
                        <div class="flex border-b mb-2">
                            <div class="ins-tab-btn active text-blue-600 border-blue-600" onclick="switchInsTab(this, 'code')">CODE</div>
                            <div class="ins-tab-btn" onclick="switchInsTab(this, 'preview')">PREVIEW</div>
                        </div>
                        <div class="ins-tab-content active" data-tab="code">
                            <div class="code-snippet">${escaped}</div>
                        </div>
                        <div class="ins-tab-content" data-tab="preview">
                            <iframe class="preview-mini-frame" srcdoc="${escapeHtml(previewBlob)}"></iframe>
                        </div>
                    </div>
                </div>
            `;
        }

        function inspectIframe(winId) {
            if (state.focusedWindowId !== winId) return;
            const winData = state.activeWindows.find(w => w.id === winId);
            const inspector = document.getElementById('inspector-root');
            
            if (!winData || winData.type === 'db' || winData.type === 'config') {
                inspector.innerHTML = `<div class="p-6 text-center text-xs opacity-40 italic">Sistema interno: Sin inspección.</div>`;
                return;
            }

            const iframe = document.getElementById(`iframe-${winId}`);
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                let html = `<div class="p-3 bg-blue-600 text-white text-[11px] font-bold mb-1 shadow-sm uppercase tracking-tighter">APP_INSPECT: ${winData.title}</div>`;

                html += renderInspectorSection('ÁRBOL_DOM_EXPLORADOR', () => `<div class="text-[10px] overflow-x-auto">${buildDomTree(doc.documentElement)}</div>`, true);

                if (state.selectedDomNodes.size > 0) {
                    html += renderInspectorSection('ELEMENTOS_SELECCIONADOS', () => {
                        return Array.from(state.selectedDomNodes).map(path => {
                            const el = getElementByPath(doc, path);
                            if (!el) return '';
                            return renderElementInspector(`NODE: ${path} (${el.tagName.toLowerCase()})`, el.outerHTML, `sel-${path}`);
                        }).join('');
                    }, true);
                }

                html += renderInspectorSection('ESTRUCTURA_LAYOUT', () => {
                    const tags = ['header', 'nav', 'main', 'aside', 'footer'];
                    return tags.map(tag => {
                        const el = doc.querySelector(tag);
                        if (!el) return `<div class="text-[9px] p-2 bg-gray-50 text-gray-400 mb-1 rounded border">${tag}: NO_ENCONTRADO</div>`;
                        return renderElementInspector(`LAYOUT: ${tag.toUpperCase()}`, el.outerHTML, `lay-${tag}`);
                    }).join('');
                });

                html += renderInspectorSection('SCRIPTS_DETECTADOS', () => {
                    const scripts = Array.from(doc.querySelectorAll('script'));
                    if (scripts.length === 0) return `<div class="text-[9px] opacity-40">No hay scripts internos.</div>`;
                    return scripts.map((s, i) => {
                        const label = s.src ? `SRC: ${s.src.split('/').pop()}` : `SCRIPT_INTERNO_${i+1}`;
                        const content = s.src ? `// Script externo cargado desde: ${s.src}` : s.innerHTML;
                        return `<div class="mb-2 p-2 bg-slate-50 border rounded"><div class="text-[8px] font-mono font-bold text-blue-800 mb-1">${label}</div><div class="code-snippet">${escapeHtml(content || '// Script vacío')}</div></div>`;
                    }).join('');
                });

                html += renderInspectorSection('ESTILOS_CSS_INTERNOS', () => {
                    const styles = Array.from(doc.querySelectorAll('style'));
                    if (styles.length === 0) return `<div class="text-[9px] opacity-40">No hay estilos internos.</div>`;
                    return styles.map((s, i) => `<div class="mb-2 p-2 bg-slate-50 border rounded"><div class="text-[8px] font-mono font-bold text-pink-800 mb-1">STYLE_BLOCK_${i+1}</div><div class="code-snippet">${escapeHtml(s.innerHTML || '/* Bloque vacío */')}</div></div>`).join('');
                });

                inspector.innerHTML = html;
            } catch (e) {
                inspector.innerHTML = `<div class="p-8 text-center text-red-500 text-xs font-mono">CORS_ERROR: ACCESO_DENEGADO (Probablemente debido a la política de seguridad del sitio externo o falta del archivo local).</div>`;
            }
        }

        function renderInspectorSection(title, contentFn, autoActive = false) {
            return `<div class="inspector-item border-b"><div class="inspector-section-header" onclick="toggleInspectorItem(this)"><span>${title}</span><span class="toggle-icon text-[8px]">${autoActive ? '▼' : '▶'}</span></div><div class="inspector-section-content ${autoActive ? 'active' : ''}">${contentFn()}</div></div>`;
        }

        function buildDomTree(element, path = "0") {
            const children = Array.from(element.children).filter(el => !['SCRIPT', 'STYLE'].includes(el.tagName));
            const hasChildren = children.length > 0;
            const nodeName = element.tagName.toLowerCase();
            let html = `<div class="dom-tree-item"><div class="dom-tree-label"><span class="dom-tree-toggle" onclick="toggleTreeNode(event, this)">${hasChildren ? '▼' : '&nbsp;'}</span><input type="checkbox" class="w-3 h-3 rounded" ${state.selectedDomNodes.has(path) ? 'checked' : ''} onchange="handleNodeCheck(this, '${state.focusedWindowId}', '${path}')"><span class="text-blue-600 font-bold">&lt;${nodeName}&gt;</span></div>`;
            if (hasChildren) {
                html += `<div class="dom-tree-node">`;
                children.forEach((child, index) => html += buildDomTree(child, `${path}-${index}`));
                html += `</div>`;
            }
            html += `</div>`;
            return html;
        }

        function handleNodeCheck(checkbox, winId, nodePath) {
            if (checkbox.checked) state.selectedDomNodes.add(nodePath);
            else state.selectedDomNodes.delete(nodePath);
            inspectIframe(winId);
        }

        function getElementByPath(doc, path) {
            const indices = path.split('-').map(Number);
            let current = doc.documentElement;
            for (let i = 1; i < indices.length; i++) {
                const cleanChildren = Array.from(current.children).filter(el => !['SCRIPT', 'STYLE'].includes(el.tagName));
                current = cleanChildren[indices[i]];
            }
            return current;
        }

        function toggleInspectorItem(header) {
            $(header).next('.inspector-section-content').toggleClass('active');
            const icon = $(header).find('.toggle-icon');
            icon.text(icon.text() === '▼' ? '▶' : '▼');
        }

        function toggleTreeNode(event, node) {
            event.stopPropagation();
            const children = $(node).closest('.dom-tree-item').find('> .dom-tree-node');
            children.toggleClass('hidden');
            $(node).text(children.hasClass('hidden') ? '▶' : '▼');
        }

        // --- UI UTILS ---

        function focusWindow(id) {
            $('.window-card').css('z-index', 10);
            $(`#${id}`).css('z-index', 50);
            state.focusedWindowId = id;
            updateWindowsNav();
            if ($(`#${id}`).data('type') === 'config') renderConfig(id);
            else inspectIframe(id);
        }

        function removeWindow(id, type) {
            $(`#${id}`).remove();
            state.activeWindows = state.activeWindows.filter(w => w.id !== id);
            if (type === 'db') state.internalOpen.db = false;
            if (type === 'config') state.internalOpen.config = false;
            updateSystemNavButtons();
            updateWindowsNav();
            if (state.focusedWindowId === id) {
                state.focusedWindowId = null;
                document.getElementById('inspector-root').innerHTML = '<div class="p-10 text-center opacity-30 text-xs">Esperando selección...</div>';
            }
        }

        function toggleSection(id) {
            const c = (id === 'header' || id === 'footer') ? 'collapsed-h' : 'collapsed-w';
            const section = $(`#${id}`);
            section.toggleClass(c);
            if (id === 'aside') $('#aside-expand-btn').toggleClass('hidden', !section.hasClass(c));
            else if (id === 'header') $('#header-expand-btn').toggle(section.hasClass(c));
            else if (id === 'footer') $('#footer-expand-btn').toggle(section.hasClass(c));
        }

        function toggleNav() { $('#nav').toggleClass('nav-expanded nav-collapsed'); }
        function updateSystemNavButtons() {
            $('#btn-nav-db').toggleClass('btn-nav-locked', state.internalOpen.db);
            $('#btn-nav-config').toggleClass('btn-nav-locked', state.internalOpen.config);
        }

        function updateWindowsNav() {
            document.getElementById('win-links-container').innerHTML = state.activeWindows.map(win => `
                <button onclick="focusWindow('${win.id}')" class="nav-item-btn flex items-center gap-3 w-full px-3 py-2 text-[10px] truncate rounded ${state.focusedWindowId === win.id ? 'bg-blue-50 text-blue-600 font-bold border-l-2 border-blue-600' : 'hover:bg-gray-100'}">
                    ${ICONS[win.type] || ICONS.module}
                    <span class="nav-text truncate">${win.title}</span>
                </button>
            `).join('');
        }

        function handleUrlSubmit() {
            let url = document.getElementById('external-url').value;
            if(!url) return;
            
            const isRelative = url.startsWith('.') || url.startsWith('/');
            const hasProtocol = /^https?:\/\//i.test(url) || url.startsWith('blob:');
            
            if(!isRelative && !hasProtocol) {
                url = 'https://' + url;
            }
            
            createWindowCard(url.split('//')[1] || url, url, 'web');
            document.getElementById('external-url').value = '';
        }

        function handleHtmlUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const blob = new Blob([e.target.result], { type: 'text/html' });
                createWindowCard(file.name, URL.createObjectURL(blob), 'module');
            };
            reader.readAsText(file);
        }

        function escapeHtml(text) {
            return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }

        async function renderDB(winId) {
            const c = document.getElementById(`content-${winId}`);
            if (!c) return;
            const bms = await db.bookmarks.toArray();
            c.innerHTML = `
                <div class="space-y-4">
                    <h3 class="font-bold border-b pb-2">EXPLORADOR_DEXIE</h3>
                    <div class="p-2 bg-gray-50 border rounded">
                        <div class="text-[9px] font-bold mb-1">TABLA: bookmarks (${bms.length})</div>
                        <pre class="text-[8px] opacity-60">${JSON.stringify(bms, null, 2)}</pre>
                    </div>
                </div>`;
        }

        async function renderConfig(winId) {
            const c = document.getElementById(`content-${winId}`);
            if (!c) return;
            const bms = await db.bookmarks.toArray();
            
            c.innerHTML = `
                <div class="space-y-6">
                    <section class="pb-4 border-b">
                        <h3 class="font-bold text-xs mb-3 text-purple-600 uppercase tracking-widest">Apariencia</h3>
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded border">
                            <span class="text-xs font-bold">Modo Oscuro (Dark Mode)</span>
                            <button onclick="toggleDarkMode()" class="px-4 py-1 rounded-full text-[10px] font-bold border transition-all ${state.darkMode ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-300'}">
                                ${state.darkMode ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </section>

                    <section>
                        <h3 class="font-bold text-xs mb-3 text-blue-600 uppercase tracking-widest">Añadir Marcador</h3>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <input type="text" id="bm-title" placeholder="Nombre (ej: App Local)" class="p-2 border rounded bg-gray-50">
                            <input type="text" id="bm-url" placeholder="URL o Ruta (../App/idx.html)" class="p-2 border rounded bg-gray-50">
                        </div>
                        <p class="text-[9px] text-gray-400 mb-2 italic">Puedes usar rutas relativas como "./archivo.html" o "../Apps/index.html".</p>
                        <button onclick="addBookmark()" class="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">GUARDAR_MARCADOR</button>
                    </section>

                    <section>
                        <h3 class="font-bold text-xs mb-3 text-gray-500 uppercase tracking-widest">URLs / Rutas Guardadas (${bms.length})</h3>
                        <div class="space-y-2">
                            ${bms.length === 0 ? '<p class="opacity-40 italic">No hay marcadores.</p>' : bms.map(bm => `
                                <div class="flex items-center justify-between p-2 bg-gray-50 border rounded group">
                                    <div class="truncate">
                                        <div class="font-bold text-gray-800">${bm.title}</div>
                                        <div class="text-[9px] opacity-50">${bm.url}</div>
                                    </div>
                                    <button onclick="deleteBookmark(${bm.id})" class="text-red-400 opacity-0 group-hover:opacity-100 px-2 font-bold">ELIMINAR</button>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>`;
        }

        // Run On Start
        $(document).ready(() => {
            initTheme();
        });
  