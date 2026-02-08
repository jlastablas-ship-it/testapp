       class IFrameBrowser {
            constructor(containerId, options = {}) {
                this.container = document.getElementById(containerId);
                this.options = options;

                // Crear elementos de la interfaz
                this.navBar = document.createElement('div');
                this.urlInput = document.createElement('input');
                this.iframe = document.createElement('iframe');

                this._setupUI();
                this._initEvents();
            }

            _setupUI() {
                // Estilos rápidos para la barra de navegación
                this.navBar.style.display = 'flex';
                this.navBar.style.gap = '5px';
                this.navBar.style.marginBottom = '10px';
                this.navBar.style.padding = '10px';

                // Configuración del Input de URL
                this.urlInput.type = 'text';
                this.urlInput.style.flex = '1';
                this.urlInput.className = 'form-control';
                this.urlInput.placeholder = 'Ingrese URL (ej: https://example.com)';
                this.urlInput.value = 'http://127.0.0.1:8081/';

                // Creación de botones
                const btnBack = this._createBtn('Back', () => this.back(), 'secondary');
                const btnForward = this._createBtn('Forward', () => this.forward(), 'secondary');
                const btnRefresh = this._createBtn('Refresh', () => this.refresh(), 'warning');
                const btnGo = this._createBtn('Go', () => this.goTo(this.urlInput.value), 'success');

                // Ensamblaje
                this.navBar.append(btnBack, btnForward, btnRefresh, this.urlInput, btnGo);

                this.iframe.style.width = this.options.width || '100%';
                this.iframe.style.height = this.options.height || '100%';
                this.iframe.style.border = 'inset';
             

                this.container.append(this.navBar, this.iframe);
            }

            _createBtn(text, action,tipo) {
                const btn = document.createElement('button');
                btn.textContent = text;
                btn.onclick = action;
                btn.className = `btn btn-${tipo || 'primary'} btn-sm`;
                return btn;
            }

            // --- Métodos de Navegación ---

            goTo(url) {
                if (!url) return;
                // Añadir protocolo si falta para evitar errores de carga
                const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
                this.iframe.src = formattedUrl;
                this.urlInput.value = formattedUrl;
            }

            back() {
                try {
                    // Uso de history.back() sobre el contentWindow del iframe
                    this.iframe.contentWindow.history.back();
                } catch (e) {
                    console.warn("Navegación bloqueada por políticas de origen (CORS)");
                }
            }

            forward() {
                try {
                    this.iframe.contentWindow.history.forward();
                } catch (e) {
                    console.warn("Navegación bloqueada por políticas de origen (CORS)");
                }
            }

            refresh() {
                // Recarga el documento actual del iframe
                this.iframe.contentWindow.location.reload();
            }

            _initEvents() {
                // Sincronizar el input cuando el iframe navega internamente (si el origen lo permite)
                this.iframe.addEventListener('load', () => {
                    try {
                        const currentUrl = this.iframe.contentWindow.location.href;
                        if (currentUrl !== 'about:blank') {
                            this.urlInput.value = currentUrl;
                        }
                    } catch (e) {
                        // Error esperado si el iframe carga un dominio distinto (Cross-Origin)
                    }
                });

                // Soporte para tecla Enter en el input
                this.urlInput.onkeypress = (e) => {
                    if (e.key === 'Enter') this.goTo(this.urlInput.value);
                };
            }

            render(htmlContent) {
                const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
                doc.open();
                doc.write(htmlContent);
                doc.close();
            }
        }

        // Inicialización
      //  const miNavegador = new IFrameBrowser('app-container', {  });
