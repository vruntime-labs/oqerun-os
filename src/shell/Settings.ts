import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

interface Preferences {
  theme: "system" | "dark" | "light";
  accent: string;
  reduceMotion: boolean;
}

export class Settings {
  private readonly PREF_PATH = "/system/preferences.json";

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(): Promise<void> {
    const windowId = "settings";

    this.wm.open({
      id: windowId,
      title: "Settings",
      width: 760,
      height: 520,
      x: 180,
      y: 70,
      content: `
        <div class="settings-app">

          <aside class="settings-sidebar">
            <button class="settings-tab active" data-tab="appearance">Appearance</button>
            <button class="settings-tab" data-tab="personalization">Personalization</button>
            <button class="settings-tab" data-tab="storage">Storage</button>
            <button class="settings-tab" data-tab="network">Network</button>
            <button class="settings-tab" data-tab="taskbar">Taskbar</button>
            <button class="settings-tab" data-tab="apps">Apps</button>
            <button class="settings-tab" data-tab="privacy">Privacy</button>
            <button class="settings-tab" data-tab="accessibility">Accessibility</button>
            <button class="settings-tab" data-tab="system">System</button>
            <button class="settings-tab" data-tab="about">About</button>
          </aside>

          <section class="settings-content">

            <div class="settings-panel active" data-panel="appearance">
              <h2>Appearance</h2>

              <div class="setting-group">
                <label>Theme</label>

                <div class="theme-buttons">
                  <button data-theme="system">System</button>
                  <button data-theme="dark">Dark</button>
                  <button data-theme="light">Light</button>
                </div>
              </div>

              <div class="setting-group">
                <label>Accent Color</label>

                <div class="accent-picker">
                  <button class="accent" data-color="#00D4FF" style="background:#00D4FF"></button>
                  <button class="accent" data-color="#5B8CFF" style="background:#5B8CFF"></button>
                  <button class="accent" data-color="#7CFF6B" style="background:#7CFF6B"></button>
                  <button class="accent" data-color="#FF6B9A" style="background:#FF6B9A"></button>
                  <button class="accent" data-color="#FFC14D" style="background:#FFC14D"></button>
                </div>
              </div>
            </div>

            <div class="settings-panel" data-panel="personalization">
              <h2>Personalization</h2>
              <p class="settings-description">Customize your desktop layout and shortcuts.</p>
              <div class="storage-card"><div class="settings-row"><div><strong>Desktop icon positions</strong><p>Drag applications freely on the desktop. Oqerun remembers their positions.</p></div><button data-reset-desktop>Reset positions</button></div></div>
              <div class="storage-card"><div class="settings-row"><div><strong>Home screen apps</strong><p>Use an app context menu to add or remove shortcuts from the desktop.</p></div><span class="settings-badge">Customizable</span></div></div>
              <div class="storage-card"><div class="settings-row"><div><strong>Taskbar apps</strong><p>Pin frequently used applications from an app context menu.</p></div><span class="settings-badge">Customizable</span></div></div>
            </div>

            <div class="settings-panel" data-panel="network">
              <h2>Network</h2>
              <p class="settings-description">Live browser connection status.</p>
              <div class="settings-status-card"><span class="status-dot" data-network-dot></span><div><strong data-network-status>Checking…</strong><p data-network-detail>Checking connection.</p></div></div>
              <div class="storage-card"><div class="settings-row"><div><strong>Connection type</strong><p>Reported by the browser when available.</p></div><strong data-network-type>Unavailable</strong></div></div>
            </div>

            <div class="settings-panel" data-panel="accessibility">
              <h2>Accessibility</h2>
              <p class="settings-description">Make Oqerun more comfortable to use.</p>
              <div class="storage-card"><div class="settings-row"><div><strong>Reduce motion</strong><p>Reduce interface animation and transitions.</p></div><button class="settings-toggle" data-reduce-motion>Off</button></div></div>
              <div class="storage-card"><h3>Keyboard shortcuts</h3><p><kbd>Alt</kbd> + <kbd>Tab</kbd> switches windows. <kbd>Ctrl</kbd> + <kbd>Space</kbd> opens Start Menu search.</p></div>
            </div>
            <div class="settings-panel" data-panel="storage">
              <h2>Storage</h2>

              <div class="storage-card">
                <h3>Oqerun Drive</h3>
                <p>Preferences are stored in <code>/system/preferences.json</code>.</p>
              </div>

              <div class="storage-card">
                <div class="storage-meter"><div class="storage-meter-fill" data-storage-fill></div></div>
                <div class="settings-row"><strong data-storage-used>Calculating…</strong><span data-storage-percent>—</span></div>
                <p data-storage-detail>Checking browser storage.</p>
              </div>

              <div class="storage-card">
                <h3>This Computer</h3>
                <p>Real folders can be connected later.</p>
              </div>

              <div class="storage-card">
                <h3>Connected Cloud</h3>
                <p>Coming soon.</p>
              </div>
            </div>

            <div class="settings-panel" data-panel="taskbar">
              <h2>Taskbar</h2>
              <div class="storage-card">
                <h3>Position</h3>
                <div class="settings-choice-row">
                  <button data-taskbar-position="bottom">Bottom</button>
                  <button data-taskbar-position="top">Top</button>
                </div>
              </div>
              <div class="storage-card">
                <h3>Behavior</h3>
                <div class="settings-choice-row">
                  <button data-taskbar-compact>Compact</button>
                  <button data-taskbar-autohide>Auto-hide</button>
                  <button data-taskbar-reset>Reset</button>
                </div>
              </div>
            </div>

            <div class="settings-panel" data-panel="apps">
              <h2>Applications</h2>
              <div class="storage-card">
                <h3>Installed applications</h3>
                <p>Manage installed Oqerun Store applications from the Start Menu context menu.</p>
              </div>
            </div>

            <div class="settings-panel" data-panel="privacy">
              <h2>Privacy</h2>
              <div class="storage-card">
                <div class="settings-row"><div><strong>Installed applications</strong><p>Applications installed from Oqerun Store can be managed from Start Menu.</p></div><span class="settings-badge" data-app-count>Loading…</span></div>
              </div>
              <div class="storage-card">
                <h3>App permissions</h3>
                <p>Installed applications declare filesystem and other permissions in their manifest.</p>
              </div>
              <div class="storage-card">
                <h3>Local data</h3>
                <p>Oqerun stores its virtual filesystem in browser-managed local storage such as Origin Private File System.</p>
              </div>
            </div>

            <div class="settings-panel" data-panel="system">
              <h2>System</h2>

              <div class="storage-card">
                <h3>System Status</h3>
                <p>Core services are running.</p>
              </div>

              <div class="storage-card">
                <h3>Filesystem</h3>
                <p>Oqerun Drive initialized.</p>
              </div>
            </div>

            <div class="settings-panel" data-panel="about">
              <h2>About Oqerun</h2>

              <div class="storage-card">
                <h3>Version</h3>
                <p>${this.kernel.version} • "${this.kernel.codename}"</p>
              </div>

              <div class="storage-card">
                <h3>Edition</h3>
                <p>Web Edition</p>
              </div>

              <div class="storage-card">
                <h3>License</h3>
                <p>Open Source</p>
              </div>
            </div>

          </section>

        </div>
      `
    });

    requestAnimationFrame(async () => {
      await this.attach(windowId);
    });
  }

  private async attach(windowId: string): Promise<void> {
    const win = document.getElementById(windowId);
    if (!win) return;

    const storedPrefs = await this.loadPreferences();
    await this.refreshSystemPanels(win);

    /*
     * Opening Settings must never silently change the current theme.
     * The desktop's current theme is the source of truth while the
     * session is running. Stored preferences are still used on boot
     * and as the fallback when no theme has been applied yet.
     */
    const currentTheme = this.getCurrentTheme();
    const prefs: Preferences = {
      ...storedPrefs,
      theme: currentTheme ?? storedPrefs.theme
    };

    if (!currentTheme) {
      this.applyPreferences(prefs);
    }

    this.syncAccentSelection(win, prefs.accent);

    const tabs = win.querySelectorAll<HTMLElement>(".settings-tab");
    const panels = win.querySelectorAll<HTMLElement>(".settings-panel");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));

        tab.classList.add("active");

        win.querySelector(`.settings-panel[data-panel="${target}"]`)
          ?.classList.add("active");
      });
    });

    win.querySelectorAll<HTMLElement>("[data-theme]").forEach(button => {
      button.addEventListener("click", async () => {
        prefs.theme = button.dataset.theme as Preferences["theme"];
        this.applyPreferences(prefs);
        await this.savePreferences(prefs);
      });
    });

    win.querySelectorAll<HTMLElement>("[data-taskbar-position]").forEach((button) => {
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

    win.querySelector<HTMLElement>("[data-taskbar-reset]")?.addEventListener("click", () => {
      const desktop = document.querySelector(".desktop");
      desktop?.classList.remove("taskbar-top", "taskbar-compact", "taskbar-auto-hide");
      desktop?.classList.add("taskbar-bottom");
      localStorage.removeItem("oqerun.taskbar.position");
      localStorage.removeItem("oqerun.taskbar.compact");
      localStorage.removeItem("oqerun.taskbar.autoHide");
    });


    win.querySelector<HTMLElement>("[data-reset-desktop]")?.addEventListener("click", () => {
      localStorage.removeItem("oqerun.desktopPositions");
      this.kernel.notify.info("Desktop", "Desktop icon positions have been reset.");
      window.dispatchEvent(new Event("resize"));
    });

    win.querySelector<HTMLElement>("[data-reduce-motion]")?.addEventListener("click", async () => {
      const enabled = document.documentElement.classList.toggle("oqerun-reduce-motion");
      document.documentElement.classList.toggle("oqerun-reduce-motion", enabled);
      const prefs = await this.loadPreferences();
      prefs.reduceMotion = enabled;
      await this.savePreferences(prefs);
      const button = win.querySelector<HTMLElement>("[data-reduce-motion]");
      if (button) {
        button.textContent = enabled ? "On" : "Off";
        button.classList.toggle("on", enabled);
      }
    });

    win.querySelectorAll<HTMLElement>(".accent").forEach(button => {
      button.addEventListener("click", async () => {
        prefs.accent = button.dataset.color || "#00D4FF";
        this.applyPreferences(prefs);
        this.syncAccentSelection(win, prefs.accent);
        await this.savePreferences(prefs);
      });
    });
  }


  private async refreshSystemPanels(win: HTMLElement): Promise<void> {
    const count = win.querySelector<HTMLElement>("[data-app-count]");
    if (count) count.textContent = `${this.kernel.applications.list().length} installed`;

    const online = navigator.onLine;
    const status = win.querySelector<HTMLElement>("[data-network-status]");
    const detail = win.querySelector<HTMLElement>("[data-network-detail]");
    const dot = win.querySelector<HTMLElement>("[data-network-dot]");
    const type = win.querySelector<HTMLElement>("[data-network-type]");
    if (status) status.textContent = online ? "Connected" : "Offline";
    if (detail) detail.textContent = online ? "The browser reports an active network connection." : "The browser reports no network connection.";
    dot?.classList.toggle("offline", !online);
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
    if (type) type.textContent = connection?.effectiveType || connection?.type || "Unavailable";

    const used = win.querySelector<HTMLElement>("[data-storage-used]");
    const percent = win.querySelector<HTMLElement>("[data-storage-percent]");
    const storageDetail = win.querySelector<HTMLElement>("[data-storage-detail]");
    const fill = win.querySelector<HTMLElement>("[data-storage-fill]");
    if (used && percent && storageDetail && fill) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage ?? 0;
        const quota = estimate.quota ?? 0;
        const ratio = quota ? Math.min(100, usage / quota * 100) : 0;
        used.textContent = `${this.formatBytes(usage)} used`;
        percent.textContent = quota ? `${ratio.toFixed(1)}%` : "—";
        storageDetail.textContent = quota ? `${this.formatBytes(quota)} estimated browser quota` : "Quota unavailable.";
        fill.style.width = `${Math.max(ratio, usage ? 1 : 0)}%`;
      } catch {
        used.textContent = "Unavailable";
        percent.textContent = "—";
        storageDetail.textContent = "Storage information unavailable.";
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  private async loadPreferences(): Promise<Preferences> {
    const defaults: Preferences = {
      theme: "system",
      accent: "#00D4FF",
      reduceMotion: false
    };

    try {
      if (!(await this.kernel.sys.exists(this.PREF_PATH))) {
        await this.savePreferences(defaults);
        return defaults;
      }

      const data = await this.kernel.sys.read(this.PREF_PATH);
      return { ...defaults, ...JSON.parse(data), reduceMotion: JSON.parse(data).reduceMotion === true };
    } catch {
      return defaults;
    }
  }

  private async savePreferences(prefs: Preferences): Promise<void> {
    await this.kernel.sys.write(
      this.PREF_PATH,
      JSON.stringify(prefs, null, 2)
    );
  }

  private syncAccentSelection(
    win: HTMLElement,
    accent: string
  ): void {
    win.querySelectorAll<HTMLElement>(".accent").forEach(button => {
      button.classList.toggle(
        "selected",
        (button.dataset.color || "").toLowerCase() === accent.toLowerCase()
      );
    });
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
}
