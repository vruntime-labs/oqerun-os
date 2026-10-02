import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

interface Preferences {
  theme: "system" | "dark" | "light";
  accent: string;
  reduceMotion: boolean;
}

type SettingItem = { id: string; label: string; keywords: string };

export class Settings {
  private readonly PREF_PATH = "/system/preferences.json";

  constructor(private kernel: Kernel, private wm: WindowManager) {}

  async open(): Promise<void> {
    const windowId = "settings";

    this.wm.open({
      id: windowId,
      title: "Settings",
      width: 980,
      height: 650,
      x: 120,
      y: 50,
      content: this.render()
    });

    requestAnimationFrame(() => void this.attach(windowId));
  }

  private render(): string {
    const base = import.meta.env.BASE_URL;
    return `
      <div class="settings-app">
        <aside class="settings-sidebar">
          <div class="settings-brand">
            <div class="settings-brand-mark">⚙</div>
            <div><strong>Settings</strong><span>Oqerun OS</span></div>
          </div>

          <div class="settings-search">
            <span>⌕</span>
            <input data-settings-search type="search" placeholder="Search settings…" aria-label="Search settings">
            <kbd>Ctrl K</kbd>
          </div>

          <nav class="settings-nav" aria-label="Settings">
            ${this.tab("appearance", "Appearance", "Theme, accent, visual style", true)}
            ${this.tab("personalization", "Personalization", "Desktop, icons, wallpaper")}
            ${this.tab("windows", "Windows", "Snapping, behavior, multitasking")}
            ${this.tab("taskbar", "Taskbar", "Position, compact mode, auto-hide")}
            ${this.tab("start", "Start Menu", "Search, sorting, applications")}
            ${this.tab("storage", "Storage", "Usage, quota, temporary data")}
            ${this.tab("network", "Network", "Connection status")}
            ${this.tab("apps", "Apps", "Installed applications")}
            ${this.tab("notifications", "Notifications", "Notification preferences")}
            ${this.tab("privacy", "Privacy", "Local data and cloud")}
            ${this.tab("accessibility", "Accessibility", "Motion and shortcuts")}
            ${this.tab("language", "Language & Region", "Language, date and time")}
            ${this.tab("updates", "Updates", "Oqerun and Store updates")}
            ${this.tab("backup", "Backup & Restore", "Preferences backup")}
            ${this.tab("developer", "Developer", "Diagnostics and runtime")}
            ${this.tab("system", "System", "Kernel and browser information")}
            ${this.tab("about", "About", "Version and license")}
          </nav>
        </aside>

        <section class="settings-content">
          <div class="settings-search-empty" data-search-empty hidden>
            <div>⌕</div><strong>No settings found</strong><p>Try a different search.</p>
          </div>

          <div class="settings-panel active" data-panel="appearance" data-search="appearance theme dark light accent color">
            <h2>Appearance</h2><p class="settings-description">Make Oqerun look the way you want.</p>
            <div class="settings-card-grid">
              <div class="setting-group"><label>Theme</label><div class="theme-buttons">
                <button data-theme="system">System</button><button data-theme="dark">Dark</button><button data-theme="light">Light</button>
              </div></div>
              <div class="setting-group"><label>Accent color</label><div class="accent-picker">
                <button class="accent" data-color="#00D4FF" style="background:#00D4FF" aria-label="Cyan"></button>
                <button class="accent" data-color="#5B8CFF" style="background:#5B8CFF" aria-label="Blue"></button>
                <button class="accent" data-color="#7CFF6B" style="background:#7CFF6B" aria-label="Green"></button>
                <button class="accent" data-color="#FF6B9A" style="background:#FF6B9A" aria-label="Pink"></button>
                <button class="accent" data-color="#FFC14D" style="background:#FFC14D" aria-label="Amber"></button>
                <button class="accent" data-color="#A978FF" style="background:#A978FF" aria-label="Purple"></button>
              </div></div>
            </div>
          </div>

          <div class="settings-panel" data-panel="personalization" data-search="personalization desktop icons wallpaper shortcuts">
            <h2>Personalization</h2><p class="settings-description">Control your desktop and shortcuts.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Desktop icons</strong><p>Drag icons freely. Oqerun remembers their positions.</p></div><button data-reset-desktop>Reset positions</button></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Desktop shortcuts</strong><p>Manage Home screen shortcuts with each app's context menu.</p></div><span class="settings-badge">Customizable</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Wallpaper</strong><p>Wallpaper selection will be available with the Oqerun personalization system.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="windows" data-search="windows snap maximize minimize alt tab multitasking">
            <h2>Windows</h2><p class="settings-description">Control window management behavior.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Window snapping</strong><p>Drag a window to the left or right edge to snap it. Drag to the top to maximize.</p></div><span class="settings-badge">Enabled</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Alt + Tab</strong><p>Cycle through visible Oqerun windows using the keyboard.</p></div><span class="settings-badge">Enabled</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Remember window positions</strong><p>Persistent per-app window layouts are planned for a future window manager update.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="taskbar" data-search="taskbar position top bottom compact auto hide clock">
            <h2>Taskbar</h2><p class="settings-description">Choose where the taskbar lives and how much space it uses.</p>
            <div class="storage-card"><h3>Position</h3><div class="settings-choice-row">
              <button data-taskbar-position="bottom">Bottom</button><button data-taskbar-position="top">Top</button>
            </div></div>
            <div class="storage-card"><h3>Behavior</h3><div class="settings-choice-row">
              <button data-taskbar-compact>Compact</button><button data-taskbar-autohide>Auto-hide</button><button data-taskbar-reset>Reset</button>
            </div></div>
          </div>

          <div class="settings-panel" data-panel="start" data-search="start menu search applications installed alphabetical recent">
            <h2>Start Menu</h2><p class="settings-description">Control how applications are discovered.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Application search</strong><p>Search applications, files and settings from Start Menu.</p></div><span class="settings-badge">Enabled</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Installed applications</strong><p>Installed Store applications appear in the application catalog.</p></div><span class="settings-badge" data-app-count>Loading…</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Application sorting</strong><p>Installed applications are displayed alphabetically.</p></div><span class="settings-badge">Alphabetical</span></div></div>
          </div>

          <div class="settings-panel" data-panel="storage" data-search="storage disk space quota files trash temporary">
            <h2>Storage</h2><p class="settings-description">See how much browser storage Oqerun can use.</p>
            <div class="storage-card">
              <div class="storage-meter"><div class="storage-meter-fill" data-storage-fill></div></div>
              <div class="settings-row"><strong data-storage-used>Calculating…</strong><span data-storage-percent>—</span></div>
              <p data-storage-detail>Checking browser storage.</p>
            </div>
            <div class="storage-card"><div class="settings-row"><div><strong>Oqerun virtual filesystem</strong><p>Documents, Downloads, Pictures and application data are stored through browser-managed storage.</p></div><span class="settings-badge">VFS</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Temporary data cleanup</strong><p>Advanced cleanup will be added without touching personal files.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="network" data-search="network internet online offline connection">
            <h2>Network</h2><p class="settings-description">Check the browser's current connection state.</p>
            <div class="settings-status-card"><span class="status-dot" data-network-dot></span><div><strong data-network-status>Checking…</strong><p data-network-detail>Checking connection.</p></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Connection type</strong><p>Reported by the browser when supported.</p></div><strong data-network-type>Unavailable</strong></div></div>
          </div>

          <div class="settings-panel" data-panel="apps" data-search="apps applications installed permissions uninstall store">
            <h2>Apps</h2><p class="settings-description">Manage applications installed in Oqerun.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Installed applications</strong><p>Open Start Menu and use an app's context menu for Open, Properties, Pin and Uninstall.</p></div><span class="settings-badge" data-app-count>Loading…</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Permissions</strong><p>Application manifests can declare filesystem access and file associations.</p></div><span class="settings-badge">Manifest-based</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>App updates</strong><p>Store update management is planned for the package manager.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="notifications" data-search="notifications alerts sound do not disturb">
            <h2>Notifications</h2><p class="settings-description">Control how Oqerun communicates system events.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>System notifications</strong><p>Oqerun applications can send in-system notifications.</p></div><span class="settings-badge">Enabled</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Notification Center</strong><p>A dedicated notification history and quick-actions panel will be added to the taskbar.</p></div><span class="settings-badge">Coming soon</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Do Not Disturb</strong><p>Silence non-critical notifications during focused work.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="privacy" data-search="privacy security data cloud permissions accounts">
            <h2>Privacy & Security</h2><p class="settings-description">Understand where Oqerun data lives and what connected services can access.</p>
            <div class="storage-card"><h3>Local data</h3><p>The Oqerun virtual filesystem is stored by the browser profile. Clearing browser site data can remove locally stored Oqerun data.</p></div>
            <div class="storage-card"><h3>Cloud accounts</h3><p>Connected cloud providers use their own authentication flow. Cloud folders are virtual mounts rather than copies of your cloud files.</p></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Application permissions</strong><p>Permission approval UI will be introduced with the full package manager.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="accessibility" data-search="accessibility motion keyboard shortcuts">
            <h2>Accessibility</h2><p class="settings-description">Make Oqerun easier to use.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Reduce motion</strong><p>Reduce interface animation and transitions.</p></div><button class="settings-toggle" data-reduce-motion>Off</button></div></div>
            <div class="storage-card"><h3>Keyboard shortcuts</h3><p><kbd>Alt</kbd> + <kbd>Tab</kbd> switches windows. <kbd>Ctrl</kbd> + <kbd>Space</kbd> opens Start Menu search.</p></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Larger text</strong><p>Global accessibility scaling is planned.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="language" data-search="language region locale date time format">
            <h2>Language & Region</h2><p class="settings-description">Choose regional preferences for the Oqerun interface.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Interface language</strong><p>Oqerun currently follows its built-in English interface.</p></div><span class="settings-badge">English</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Region</strong><p>Browser locale</p></div><strong data-locale>Detecting…</strong></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Time zone</strong><p>Browser-reported time zone</p></div><strong data-timezone>Detecting…</strong></div></div>
          </div>

          <div class="settings-panel" data-panel="updates" data-search="updates version upgrade store">
            <h2>Updates</h2><p class="settings-description">Keep Oqerun and its ecosystem current.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Oqerun OS</strong><p>Current kernel: ${this.kernel.version} · ${this.kernel.codename}</p></div><span class="settings-badge">Current session</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Oqerun Store</strong><p>Store applications are updated independently from the OS.</p></div><span class="settings-badge">Store managed</span></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Automatic update service</strong><p>Automatic OS update delivery will be added when the release/update channel is ready.</p></div><span class="settings-badge">Coming soon</span></div></div>
          </div>

          <div class="settings-panel" data-panel="backup" data-search="backup restore export import preferences">
            <h2>Backup & Restore</h2><p class="settings-description">Protect your Oqerun preferences and desktop layout.</p>
            <div class="storage-card"><div class="settings-row"><div><strong>Export settings</strong><p>Save your Oqerun preferences as a JSON file.</p></div><button data-export-settings>Export</button></div></div>
            <div class="storage-card"><div class="settings-row"><div><strong>Import settings</strong><p>Restore preferences from an exported JSON file.</p></div><button data-import-settings>Import</button></div></div>
            <input type="file" accept="application/json,.json" data-import-file hidden>
            <div class="storage-card"><div class="settings-row"><div><strong>Factory reset</strong><p>Reset Oqerun preferences without deleting the virtual filesystem or installed applications.</p></div><button class="danger-button" data-reset-preferences>Reset</button></div></div>
          </div>

          <div class="settings-panel" data-panel="developer" data-search="developer diagnostics debug runtime wasm vfs service worker">
            <h2>Developer</h2><p class="settings-description">Diagnostics for advanced Oqerun users.</p>
            <div class="settings-card-grid">
              <div class="settings-info-card"><strong>VFS</strong><p>Operational</p></div>
              <div class="settings-info-card"><strong>Kernel</strong><p>${this.kernel.version}</p></div>
              <div class="settings-info-card"><strong>Online</strong><p data-dev-online>Checking…</p></div>
              <div class="settings-info-card"><strong>Service Worker</strong><p data-sw-status>Checking…</p></div>
            </div>
            <div class="storage-card"><div class="settings-row"><div><strong>Runtime diagnostics</strong><p>Browser and Oqerun runtime details are shown below.</p></div><button data-copy-diagnostics>Copy diagnostics</button></div><pre class="settings-diagnostics" data-diagnostics>Collecting…</pre></div>
          </div>

          <div class="settings-panel" data-panel="system" data-search="system kernel browser screen platform">
            <h2>System</h2><p class="settings-description">Information about the current Oqerun session.</p>
            <div class="settings-card-grid">
              <div class="settings-info-card"><strong>Kernel</strong><p>${this.kernel.version} · ${this.kernel.codename}</p></div>
              <div class="settings-info-card"><strong>Platform</strong><p data-platform>Detecting…</p></div>
              <div class="settings-info-card"><strong>Screen</strong><p data-screen>Detecting…</p></div>
              <div class="settings-info-card"><strong>Browser</strong><p data-browser>Detecting…</p></div>
            </div>
          </div>

          <div class="settings-panel" data-panel="about" data-search="about oqerun version license">
            <h2>About Oqerun</h2>
            <div class="about-hero"><img src="${base}branding/icon-flat-1024.png" alt="Oqerun"><div><strong>Oqerun OS</strong><span>The Web, Reimagined as an Operating System.</span></div></div>
            <div class="settings-card-grid">
              <div class="settings-info-card"><strong>Version</strong><p>${this.kernel.version} · "${this.kernel.codename}"</p></div>
              <div class="settings-info-card"><strong>Edition</strong><p>Web Edition</p></div>
              <div class="settings-info-card"><strong>License</strong><p>MIT · Open Source</p></div>
              <div class="settings-info-card"><strong>Publisher</strong><p>VRuntime Labs</p></div>
            </div>
          </div>
        </section>
      </div>`;
  }

  private tab(id: string, label: string, description: string, active = false): string {
    return `<button class="settings-tab${active ? " active" : ""}" data-tab="${id}" title="${description}"><span>${label}</span></button>`;
  }

  private async attach(windowId: string): Promise<void> {
    const win = document.getElementById(windowId);
    if (!win) return;

    const prefs = await this.loadPreferences();
    const currentTheme = this.getCurrentTheme();
    if (!currentTheme) this.applyPreferences(prefs);

    this.syncAccentSelection(win, prefs.accent);
    this.syncMotion(win, prefs.reduceMotion);
    this.refreshSystemPanels(win);

    const tabs = [...win.querySelectorAll<HTMLElement>(".settings-tab")];
    const panels = [...win.querySelectorAll<HTMLElement>(".settings-panel")];
    const search = win.querySelector<HTMLInputElement>("[data-settings-search]");
    const empty = win.querySelector<HTMLElement>("[data-search-empty]");

    const activate = (id: string) => {
      tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === id));
      panels.forEach(panel => panel.classList.toggle("active", panel.dataset.panel === id));
      if (search) search.value = "";
      if (empty) empty.hidden = true;
    };

    tabs.forEach(tab => tab.addEventListener("click", () => activate(tab.dataset.tab || "appearance")));

    const filterSettings = () => {
      const query = (search?.value || "").trim().toLowerCase();
      if (!query) {
        tabs.forEach(tab => tab.hidden = false);
        panels.forEach(panel => panel.hidden = false);
        if (empty) empty.hidden = true;
        return;
      }

      let found = false;
      tabs.forEach(tab => {
        const panel = panels.find(p => p.dataset.panel === tab.dataset.tab);
        const haystack = `${tab.textContent || ""} ${panel?.dataset.search || ""}`.toLowerCase();
        const match = haystack.includes(query);
        tab.hidden = !match;
        if (panel) panel.hidden = !match;
        if (match && !found) {
          found = true;
          tabs.forEach(t => t.classList.remove("active"));
          panels.forEach(p => p.classList.remove("active"));
          tab.classList.add("active");
          panel?.classList.add("active");
        }
      });
      if (empty) empty.hidden = found;
    };

    search?.addEventListener("input", filterSettings);
    search?.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        search.value = "";
        filterSettings();
        search.blur();
      }
    });
    document.addEventListener("keydown", event => {
      if (event.ctrlKey && event.key.toLowerCase() === "k" && document.getElementById(windowId)) {
        event.preventDefault();
        search?.focus();
      }
    }, { once: false });

    win.querySelectorAll<HTMLElement>("[data-theme]").forEach(button => {
      button.addEventListener("click", async () => {
        prefs.theme = button.dataset.theme as Preferences["theme"];
        this.applyPreferences(prefs);
        await this.savePreferences(prefs);
      });
    });

    win.querySelectorAll<HTMLElement>(".accent").forEach(button => {
      button.addEventListener("click", async () => {
        prefs.accent = button.dataset.color || "#00D4FF";
        this.applyPreferences(prefs);
        this.syncAccentSelection(win, prefs.accent);
        await this.savePreferences(prefs);
      });
    });

    win.querySelector<HTMLElement>("[data-taskbar-position]")?.parentElement?.querySelectorAll<HTMLElement>("[data-taskbar-position]").forEach(button => {
      button.addEventListener("click", () => {
        const position = button.dataset.taskbarPosition === "top" ? "top" : "bottom";
        const desktop = document.querySelector(".desktop");
        desktop?.classList.toggle("taskbar-top", position === "top");
        desktop?.classList.toggle("taskbar-bottom", position !== "top");
        localStorage.setItem("oqerun.taskbar.position", position);
      });
    });

    win.querySelector<HTMLElement>("[data-taskbar-compact]")?.addEventListener("click", () => {
      const desktop = document.querySelector(".desktop");
      const enabled = desktop?.classList.toggle("taskbar-compact") ?? false;
      localStorage.setItem("oqerun.taskbar.compact", enabled ? "1" : "0");
    });

    win.querySelector<HTMLElement>("[data-taskbar-autohide]")?.addEventListener("click", () => {
      const desktop = document.querySelector(".desktop");
      const enabled = desktop?.classList.toggle("taskbar-auto-hide") ?? false;
      localStorage.setItem("oqerun.taskbar.autoHide", enabled ? "1" : "0");
    });

    win.querySelector<HTMLElement>("[data-taskbar-reset]")?.addEventListener("click", () => this.resetTaskbar());

    win.querySelector<HTMLElement>("[data-reset-desktop]")?.addEventListener("click", () => {
      localStorage.removeItem("oqerun.desktopPositions");
      this.kernel.notify.info("Desktop", "Desktop icon positions reset.");
    });

    win.querySelector<HTMLElement>("[data-reduce-motion]")?.addEventListener("click", async () => {
      prefs.reduceMotion = !prefs.reduceMotion;
      this.applyPreferences(prefs);
      this.syncMotion(win, prefs.reduceMotion);
      await this.savePreferences(prefs);
    });

    win.querySelector<HTMLElement>("[data-export-settings]")?.addEventListener("click", () => this.exportSettings(prefs));
    const importFile = win.querySelector<HTMLInputElement>("[data-import-file]");
    win.querySelector<HTMLElement>("[data-import-settings]")?.addEventListener("click", () => importFile?.click());
    importFile?.addEventListener("change", async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text()) as Partial<Preferences> & { preferences?: Partial<Preferences>; desktopPositions?: string };
        const next: Preferences = {
          theme: imported.preferences?.theme === "dark" || imported.preferences?.theme === "light" ? imported.preferences.theme : (imported.theme === "dark" || imported.theme === "light" ? imported.theme : "system"),
          accent: typeof imported.preferences?.accent === "string" ? imported.preferences.accent : (typeof imported.accent === "string" ? imported.accent : "#00D4FF"),
          reduceMotion: imported.preferences?.reduceMotion === true || imported.reduceMotion === true
        };
        await this.savePreferences(next);
        this.applyPreferences(next);
        this.syncAccentSelection(win, next.accent);
        this.syncMotion(win, next.reduceMotion);
        if (typeof imported.desktopPositions === "string") localStorage.setItem("oqerun.desktopPositions", imported.desktopPositions);
        this.kernel.notify.info("Settings", "Preferences imported.");
      } catch {
        this.kernel.notify.error("Settings", "The selected settings file is invalid.");
      }
      importFile.value = "";
    });

    win.querySelector<HTMLElement>("[data-reset-preferences]")?.addEventListener("click", async () => {
      if (!window.confirm("Reset Oqerun preferences? Your files and installed apps will not be deleted.")) return;
      ["oqerun.taskbar.position","oqerun.taskbar.compact","oqerun.taskbar.autoHide","oqerun.desktopPositions","oqerun.pinnedApps","oqerun.homeApps"].forEach(key => localStorage.removeItem(key));
      const defaults: Preferences = { theme: "system", accent: "#00D4FF", reduceMotion: false };
      await this.savePreferences(defaults);
      this.applyPreferences(defaults);
      this.syncAccentSelection(win, defaults.accent);
      this.syncMotion(win, false);
      this.resetTaskbar();
      this.kernel.notify.info("Settings", "Preferences reset.");
    });

    win.querySelector<HTMLElement>("[data-copy-diagnostics]")?.addEventListener("click", async () => {
      const text = win.querySelector<HTMLElement>("[data-diagnostics]")?.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        this.kernel.notify.info("Developer", "Diagnostics copied to clipboard.");
      } catch {
        this.kernel.notify.error("Developer", "Clipboard access is unavailable.");
      }
    });
  }

  private async exportSettings(prefs: Preferences): Promise<void> {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      preferences: prefs,
      desktopPositions: localStorage.getItem("oqerun.desktopPositions") || "",
      taskbar: {
        position: localStorage.getItem("oqerun.taskbar.position") || "bottom",
        compact: localStorage.getItem("oqerun.taskbar.compact") === "1",
        autoHide: localStorage.getItem("oqerun.taskbar.autoHide") === "1"
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "oqerun-settings.json";
    anchor.click();
    URL.revokeObjectURL(url);
    this.kernel.notify.info("Settings", "Settings exported.");
  }

  private resetTaskbar(): void {
    const desktop = document.querySelector(".desktop");
    desktop?.classList.remove("taskbar-top", "taskbar-compact", "taskbar-auto-hide");
    desktop?.classList.add("taskbar-bottom");
    ["oqerun.taskbar.position","oqerun.taskbar.compact","oqerun.taskbar.autoHide"].forEach(key => localStorage.removeItem(key));
  }

  private async refreshSystemPanels(win: HTMLElement): Promise<void> {
    const count = win.querySelectorAll<HTMLElement>("[data-app-count]");
    count.forEach(node => node.textContent = `${this.kernel.applications.list().length} installed`);

    const online = navigator.onLine;
    win.querySelector<HTMLElement>("[data-network-status]")!.textContent = online ? "Connected" : "Offline";
    win.querySelector<HTMLElement>("[data-network-detail]")!.textContent = online ? "The browser reports an active network connection." : "The browser reports no network connection.";
    win.querySelector<HTMLElement>("[data-network-dot]")?.classList.toggle("offline", !online);

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
    const type = win.querySelector<HTMLElement>("[data-network-type]");
    if (type) type.textContent = connection?.effectiveType || connection?.type || "Unavailable";

    const locale = win.querySelector<HTMLElement>("[data-locale]");
    const timezone = win.querySelector<HTMLElement>("[data-timezone]");
    if (locale) locale.textContent = navigator.language || "Unknown";
    if (timezone) timezone.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";

    const platform = win.querySelector<HTMLElement>("[data-platform]");
    const screen = win.querySelector<HTMLElement>("[data-screen]");
    const browser = win.querySelector<HTMLElement>("[data-browser]");
    if (platform) platform.textContent = navigator.platform || "Web browser";
    if (screen) screen.textContent = `${window.screen.width} × ${window.screen.height} · ${window.devicePixelRatio || 1}×`;
    if (browser) browser.textContent = this.browser();

    const sw = win.querySelector<HTMLElement>("[data-sw-status]");
    if (sw) sw.textContent = "serviceWorker" in navigator ? "Supported" : "Unavailable";
    const devOnline = win.querySelector<HTMLElement>("[data-dev-online]");
    if (devOnline) devOnline.textContent = online ? "Online" : "Offline";

    const diagnostics = win.querySelector<HTMLElement>("[data-diagnostics]");
    if (diagnostics) diagnostics.textContent = [
      `Oqerun: ${this.kernel.version} (${this.kernel.codename})`,
      `Platform: ${navigator.platform || "unknown"}`,
      `Browser: ${this.browser()}`,
      `Language: ${navigator.language || "unknown"}`,
      `Screen: ${window.screen.width}x${window.screen.height}`,
      `Device pixel ratio: ${window.devicePixelRatio || 1}`,
      `Online: ${navigator.onLine}`,
      `Service Worker API: ${"serviceWorker" in navigator}`,
      `Apps installed: ${this.kernel.applications.list().length}`
    ].join("\n");

    const used = win.querySelector<HTMLElement>("[data-storage-used]");
    const percent = win.querySelector<HTMLElement>("[data-storage-percent]");
    const detail = win.querySelector<HTMLElement>("[data-storage-detail]");
    const fill = win.querySelector<HTMLElement>("[data-storage-fill]");
    if (used && percent && detail && fill) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage ?? 0;
        const quota = estimate.quota ?? 0;
        const ratio = quota ? Math.min(100, usage / quota * 100) : 0;
        used.textContent = `${this.bytes(usage)} used`;
        percent.textContent = quota ? `${ratio.toFixed(1)}%` : "—";
        detail.textContent = quota ? `${this.bytes(quota)} estimated browser quota` : "Quota unavailable.";
        fill.style.width = `${Math.max(ratio, usage ? 1 : 0)}%`;
      } catch {
        used.textContent = "Unavailable";
        percent.textContent = "—";
        detail.textContent = "Storage information unavailable.";
      }
    }
  }

  private async loadPreferences(): Promise<Preferences> {
    const defaults: Preferences = { theme: "system", accent: "#00D4FF", reduceMotion: false };
    try {
      if (!(await this.kernel.sys.exists(this.PREF_PATH))) {
        await this.savePreferences(defaults);
        return defaults;
      }
      const data = JSON.parse(await this.kernel.sys.read(this.PREF_PATH)) as Partial<Preferences>;
      return {
        theme: data.theme === "dark" || data.theme === "light" ? data.theme : "system",
        accent: typeof data.accent === "string" ? data.accent : defaults.accent,
        reduceMotion: data.reduceMotion === true
      };
    } catch {
      return defaults;
    }
  }

  private async savePreferences(prefs: Preferences): Promise<void> {
    await this.kernel.sys.write(this.PREF_PATH, JSON.stringify(prefs, null, 2));
  }

  private syncAccentSelection(win: HTMLElement, accent: string): void {
    win.querySelectorAll<HTMLElement>(".accent").forEach(button => {
      button.classList.toggle("selected", (button.dataset.color || "").toLowerCase() === accent.toLowerCase());
    });
  }

  private syncMotion(win: HTMLElement, enabled: boolean): void {
    const button = win.querySelector<HTMLElement>("[data-reduce-motion]");
    if (!button) return;
    button.textContent = enabled ? "On" : "Off";
    button.classList.toggle("on", enabled);
  }

  private getCurrentTheme(): Preferences["theme"] | null {
    const app = document.getElementById("app");
    if (!app) return null;
    if (app.classList.contains("theme-dark")) return "dark";
    if (app.classList.contains("theme-light")) return "light";
    if (app.classList.contains("theme-system")) return "system";
    return null;
  }

  private applyPreferences(prefs: Preferences): void {
    const app = document.getElementById("app");
    if (!app) return;
    app.classList.remove("theme-system", "theme-dark", "theme-light");
    app.classList.add(`theme-${prefs.theme}`);
    document.documentElement.style.setProperty("--accent", prefs.accent);
    document.documentElement.classList.toggle("oqerun-reduce-motion", prefs.reduceMotion);
  }

  private browser(): string {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "Microsoft Edge";
    if (/Chrome\//.test(ua)) return "Google Chrome";
    if (/Firefox\//.test(ua)) return "Mozilla Firefox";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    return "Web browser";
  }

  private bytes(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  }
}
