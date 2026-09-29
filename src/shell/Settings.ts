import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

interface Preferences {
  theme: "system" | "dark" | "light";
  accent: string;
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
            <button class="settings-tab" data-tab="storage">Storage</button>
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

            <div class="settings-panel" data-panel="storage">
              <h2>Storage</h2>

              <div class="storage-card">
                <h3>Oqerun Drive</h3>
                <p>Preferences are stored in <code>/system/preferences.json</code>.</p>
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

    win.querySelectorAll<HTMLElement>(".accent").forEach(button => {
      button.addEventListener("click", async () => {
        prefs.accent = button.dataset.color || "#00D4FF";
        this.applyPreferences(prefs);
        this.syncAccentSelection(win, prefs.accent);
        await this.savePreferences(prefs);
      });
    });
  }

  private async loadPreferences(): Promise<Preferences> {
    const defaults: Preferences = {
      theme: "system",
      accent: "#00D4FF"
    };

    try {
      if (!(await this.kernel.sys.exists(this.PREF_PATH))) {
        await this.savePreferences(defaults);
        return defaults;
      }

      const data = await this.kernel.sys.read(this.PREF_PATH);
      return { ...defaults, ...JSON.parse(data) };
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
  }
}
