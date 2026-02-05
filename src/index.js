/**
 * WebMonitor - Embeddable browser component for Electron apps
 * Bypasses X-Frame-Options and CSP restrictions
 */

const { session } = require('electron');

class WebMonitor {
  constructor(options = {}) {
    this.options = {
      container: options.container || document.body,
      theme: options.theme || 'dark',
      showTabs: options.showTabs !== false,
      showNavigation: options.showNavigation !== false,
      showStatusBar: options.showStatusBar !== false,
      startUrl: options.startUrl || '',
      userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      onNavigate: options.onNavigate || null,
      onTitleChange: options.onTitleChange || null,
      onLoadStart: options.onLoadStart || null,
      onLoadEnd: options.onLoadEnd || null,
      onError: options.onError || null,
    };

    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.initialized = false;
  }

  /**
   * Initialize the WebMonitor - call this once in main process
   */
  static setupMain() {
    // Remove X-Frame-Options and CSP headers
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };

      const headersToRemove = [
        'x-frame-options',
        'X-Frame-Options',
        'content-security-policy',
        'Content-Security-Policy',
        'content-security-policy-report-only',
        'Content-Security-Policy-Report-Only'
      ];

      headersToRemove.forEach(h => delete headers[h]);
      callback({ responseHeaders: headers });
    });
  }

  /**
   * Initialize and render the component
   */
  init() {
    if (this.initialized) return this;

    const container = typeof this.options.container === 'string'
      ? document.querySelector(this.options.container)
      : this.options.container;

    if (!container) {
      throw new Error('WebMonitor: Container not found');
    }

    container.innerHTML = this._getHTML();
    this._attachStyles();
    this._bindEvents();

    // Create first tab
    this.newTab(this.options.startUrl);

    this.initialized = true;
    return this;
  }

  /**
   * Create a new tab
   */
  newTab(url = '') {
    const id = ++this.tabCounter;
    const tab = { id, url: url || '', title: 'New Tab' };
    this.tabs.push(tab);

    const webview = document.createElement('webview');
    webview.id = `wm-webview-${id}`;
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('webpreferences', 'contextIsolation=yes');
    webview.style.cssText = 'flex:1;width:100%;height:100%;border:none;';

    if (url) webview.src = url;

    document.getElementById('wm-content').appendChild(webview);
    this._attachWebviewEvents(webview, tab);
    this.switchTab(id);
    this._renderTabs();

    return id;
  }

  /**
   * Switch to a tab
   */
  switchTab(id) {
    this.activeTabId = id;
    const tab = this.tabs.find(t => t.id === id);

    document.querySelectorAll('webview').forEach(wv => wv.classList.remove('active'));
    const activeWebview = document.getElementById(`wm-webview-${id}`);
    if (activeWebview) activeWebview.classList.add('active');

    const urlInput = document.getElementById('wm-url-input');
    if (urlInput) urlInput.value = tab?.url || '';

    const placeholder = document.getElementById('wm-placeholder');
    if (placeholder) {
      placeholder.style.display = tab?.url ? 'none' : 'flex';
    }

    this._renderTabs();
  }

  /**
   * Close a tab
   */
  closeTab(id) {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index === -1) return;

    const webview = document.getElementById(`wm-webview-${id}`);
    if (webview) webview.remove();

    this.tabs.splice(index, 1);

    if (this.tabs.length === 0) {
      this.activeTabId = null;
      const urlInput = document.getElementById('wm-url-input');
      if (urlInput) urlInput.value = '';
      const placeholder = document.getElementById('wm-placeholder');
      if (placeholder) placeholder.style.display = 'flex';
    } else if (this.activeTabId === id) {
      const newIndex = Math.min(index, this.tabs.length - 1);
      this.switchTab(this.tabs[newIndex].id);
    }

    this._renderTabs();
  }

  /**
   * Check if input is a valid URL
   */
  _isValidUrl(input) {
    // Check if it looks like a URL (has domain pattern)
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
    const localhostPattern = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/;
    return urlPattern.test(input) || localhostPattern.test(input);
  }

  /**
   * Navigate to URL in current tab
   */
  navigate(url) {
    if (!url) return;

    // If not a URL, search in Google
    if (!this._isValidUrl(url)) {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
    } else if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }

    if (this.activeTabId === null) {
      this.newTab(url);
    } else {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab) {
        tab.url = url;
        const webview = document.getElementById(`wm-webview-${this.activeTabId}`);
        if (webview) webview.src = url;
      }
    }

    const placeholder = document.getElementById('wm-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  }

  /**
   * Go back in current tab
   */
  goBack() {
    const webview = document.getElementById(`wm-webview-${this.activeTabId}`);
    if (webview && webview.canGoBack()) webview.goBack();
  }

  /**
   * Go forward in current tab
   */
  goForward() {
    const webview = document.getElementById(`wm-webview-${this.activeTabId}`);
    if (webview && webview.canGoForward()) webview.goForward();
  }

  /**
   * Reload current tab
   */
  reload() {
    const webview = document.getElementById(`wm-webview-${this.activeTabId}`);
    if (webview) webview.reload();
  }

  /**
   * Get current URL
   */
  getCurrentUrl() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    return tab?.url || '';
  }

  /**
   * Get all tabs
   */
  getTabs() {
    return [...this.tabs];
  }

  // Private methods
  _attachWebviewEvents(webview, tab) {
    webview.addEventListener('did-start-loading', () => {
      this._setStatus('loading', 'Loading...');
      if (this.options.onLoadStart) this.options.onLoadStart(tab);
    });

    webview.addEventListener('did-stop-loading', () => {
      this._setStatus('ready', 'Ready');
      if (this.options.onLoadEnd) this.options.onLoadEnd(tab);
    });

    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode !== -3) {
        this._setStatus('error', `Error: ${e.errorDescription}`);
        if (this.options.onError) this.options.onError(tab, e);
      }
    });

    webview.addEventListener('page-title-updated', (e) => {
      tab.title = e.title || 'Untitled';
      this._renderTabs();
      if (this.options.onTitleChange) this.options.onTitleChange(tab, e.title);
    });

    webview.addEventListener('did-navigate', (e) => {
      tab.url = e.url;
      if (this.activeTabId === tab.id) {
        const urlInput = document.getElementById('wm-url-input');
        if (urlInput) urlInput.value = e.url;
      }
      if (this.options.onNavigate) this.options.onNavigate(tab, e.url);
    });
  }

  _setStatus(type, text) {
    const dot = document.getElementById('wm-status-dot');
    const statusText = document.getElementById('wm-status-text');

    if (dot) {
      dot.className = 'wm-status-dot';
      if (type === 'loading') dot.classList.add('loading');
      if (type === 'error') dot.classList.add('error');
    }
    if (statusText) statusText.textContent = text;
  }

  _renderTabs() {
    const container = document.getElementById('wm-tabs-container');
    if (!container || !this.options.showTabs) return;

    container.innerHTML = this.tabs.map(tab => `
      <div class="wm-tab ${tab.id === this.activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
        <span class="wm-tab-title">${this._escapeHtml(tab.title)}</span>
        <button class="wm-tab-close" data-close-id="${tab.id}">&times;</button>
      </div>
    `).join('');

    // Attach click events
    container.querySelectorAll('.wm-tab').forEach(el => {
      el.addEventListener('click', (e) => {
        if (!e.target.classList.contains('wm-tab-close')) {
          this.switchTab(parseInt(el.dataset.tabId));
        }
      });
    });

    container.querySelectorAll('.wm-tab-close').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(parseInt(el.dataset.closeId));
      });
    });
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _bindEvents() {
    // URL input
    const urlInput = document.getElementById('wm-url-input');
    const goBtn = document.getElementById('wm-go-btn');

    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.navigate(urlInput.value);
      });
    }
    if (goBtn) {
      goBtn.addEventListener('click', () => this.navigate(urlInput?.value));
    }

    // Navigation buttons
    document.getElementById('wm-back-btn')?.addEventListener('click', () => this.goBack());
    document.getElementById('wm-forward-btn')?.addEventListener('click', () => this.goForward());
    document.getElementById('wm-reload-btn')?.addEventListener('click', () => this.reload());
    document.getElementById('wm-new-tab-btn')?.addEventListener('click', () => this.newTab());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 't') { e.preventDefault(); this.newTab(); }
      if (e.ctrlKey && e.key === 'w') { e.preventDefault(); if (this.activeTabId) this.closeTab(this.activeTabId); }
      if (e.ctrlKey && e.key === 'r') { e.preventDefault(); this.reload(); }
    });
  }

  _getHTML() {
    const nav = this.options.showNavigation ? `
      <div class="wm-nav-buttons">
        <button class="wm-nav-btn" id="wm-back-btn" title="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="wm-nav-btn" id="wm-forward-btn" title="Forward">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button class="wm-nav-btn" id="wm-reload-btn" title="Reload">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        </button>
      </div>
    ` : '';

    const tabs = this.options.showTabs ? `
      <div class="wm-tabs-bar">
        <div id="wm-tabs-container"></div>
        <button class="wm-new-tab-btn" id="wm-new-tab-btn" title="New Tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    ` : '';

    const statusBar = this.options.showStatusBar ? `
      <div class="wm-status-bar">
        <div class="wm-status-indicator">
          <div class="wm-status-dot" id="wm-status-dot"></div>
          <span id="wm-status-text">Ready</span>
        </div>
      </div>
    ` : '';

    return `
      <div class="wm-container wm-theme-${this.options.theme}">
        ${tabs}
        <div class="wm-toolbar">
          ${nav}
          <div class="wm-url-bar">
            <input type="text" id="wm-url-input" placeholder="Search Google or enter URL...">
            <button id="wm-go-btn">Go</button>
          </div>
        </div>
        <div class="wm-content" id="wm-content">
          <div class="wm-placeholder" id="wm-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            <p>Enter a URL to start</p>
          </div>
        </div>
        ${statusBar}
      </div>
    `;
  }

  _attachStyles() {
    if (document.getElementById('wm-styles')) return;

    const style = document.createElement('style');
    style.id = 'wm-styles';
    style.textContent = this._getCSS();
    document.head.appendChild(style);
  }

  _getCSS() {
    return `
      .wm-container{display:flex;flex-direction:column;height:100%;width:100%;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
      .wm-theme-dark{background:#202124;color:#e8eaed}
      .wm-theme-dark .wm-toolbar{background:#35363a;border-bottom:none}
      .wm-theme-dark .wm-nav-btn{background:transparent;color:#9aa0a6}
      .wm-theme-dark .wm-nav-btn:hover{background:rgba(255,255,255,.1);color:#e8eaed}
      .wm-theme-dark .wm-url-bar{background:#202124;border:none;border-radius:24px}
      .wm-theme-dark .wm-url-bar:focus-within{background:#303134}
      .wm-theme-dark .wm-url-bar input{color:#e8eaed}
      .wm-theme-dark .wm-tabs-bar{background:#202124;border-bottom:none}
      .wm-theme-dark .wm-tab{background:transparent;border:none}
      .wm-theme-dark .wm-tab:hover{background:#35363a}
      .wm-theme-dark .wm-tab.active{background:#35363a;border-radius:8px 8px 0 0}
      .wm-theme-dark .wm-tab-title{color:#9aa0a6}
      .wm-theme-dark .wm-tab.active .wm-tab-title{color:#e8eaed}
      .wm-theme-dark .wm-content{background:#202124}
      .wm-theme-dark .wm-placeholder{color:#64748b}
      .wm-theme-dark .wm-status-bar{background:#202124;border-top:1px solid #35363a;color:#9aa0a6}
      .wm-theme-light{background:#fff;color:#202124}
      .wm-theme-light .wm-toolbar{background:#fff;border-bottom:none}
      .wm-theme-light .wm-nav-btn{background:transparent;color:#5f6368}
      .wm-theme-light .wm-nav-btn:hover{background:rgba(0,0,0,.06);color:#202124}
      .wm-theme-light .wm-url-bar{background:#f1f3f4;border:none;border-radius:24px}
      .wm-theme-light .wm-url-bar:focus-within{background:#fff;box-shadow:0 1px 6px rgba(32,33,36,.28)}
      .wm-theme-light .wm-url-bar input{color:#202124}
      .wm-theme-light .wm-tabs-bar{background:#dee1e6;border-bottom:none}
      .wm-theme-light .wm-tab{background:transparent;border:none}
      .wm-theme-light .wm-tab:hover{background:rgba(0,0,0,.05)}
      .wm-theme-light .wm-tab.active{background:#fff;border-radius:8px 8px 0 0}
      .wm-theme-light .wm-tab-title{color:#5f6368}
      .wm-theme-light .wm-tab.active .wm-tab-title{color:#202124}
      .wm-theme-light .wm-content{background:#f8fafc}
      .wm-theme-light .wm-placeholder{color:#94a3b8}
      .wm-theme-light .wm-status-bar{background:#fff;border-top:1px solid #e2e8f0;color:#94a3b8}
      .wm-toolbar{padding:6px 8px;display:flex;align-items:center;gap:8px}
      .wm-nav-buttons{display:flex;gap:4px}
      .wm-nav-btn{width:32px;height:32px;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
      .wm-nav-btn:active{transform:scale(.95)}
      .wm-nav-btn svg{width:18px;height:18px}
      .wm-url-bar{flex:1;display:flex;gap:4px;border-radius:24px;padding:4px 12px;transition:all .2s;align-items:center}
      .wm-url-bar input{flex:1;border:none;background:transparent;font-size:.875rem;padding:6px 8px;outline:none}
      .wm-url-bar input::placeholder{color:#9aa0a6}
      .wm-url-bar button{display:none}
      .wm-tabs-bar{display:flex;align-items:flex-end;padding:8px 8px 0;gap:2px;overflow-x:auto;min-height:42px}
      #wm-tabs-container{display:flex;align-items:flex-end;gap:2px}
      .wm-tab{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px 8px 0 0;cursor:pointer;max-width:240px;min-width:100px;transition:all .15s;position:relative}
      .wm-tab-title{flex:1;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .wm-tab-close{width:16px;height:16px;border:none;background:transparent;color:inherit;cursor:pointer;border-radius:50%;opacity:0;transition:opacity .15s;display:flex;align-items:center;justify-content:center;font-size:14px}
      .wm-tab:hover .wm-tab-close{opacity:.6}
      .wm-tab-close:hover{opacity:1!important;background:rgba(255,255,255,.1);color:#ef4444}
      .wm-new-tab-btn{width:28px;height:28px;border:none;border-radius:50%;background:transparent;color:inherit;cursor:pointer;opacity:.5;margin-left:4px;margin-bottom:4px}
      .wm-new-tab-btn:hover{opacity:1;background:rgba(255,255,255,.1)}
      .wm-content{flex:1;position:relative;overflow:hidden;min-height:0;display:flex}
      .wm-content webview{flex:1;width:100%;height:100%;border:none;display:none}
      .wm-content webview.active{display:flex}
      .wm-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
      .wm-placeholder svg{width:80px;height:80px;opacity:.3}
      .wm-status-bar{padding:2px 12px;font-size:.7rem;display:flex}
      .wm-status-indicator{display:flex;align-items:center;gap:6px}
      .wm-status-dot{width:8px;height:8px;border-radius:50%;background:#22c55e}
      .wm-status-dot.loading{background:#eab308;animation:wm-pulse 1s infinite}
      .wm-status-dot.error{background:#ef4444}
      @keyframes wm-pulse{0%,100%{opacity:1}50%{opacity:.5}}
    `;
  }
}

module.exports = WebMonitor;