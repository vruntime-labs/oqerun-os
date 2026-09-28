import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class Settings {
  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  open(): void {
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
                <p>Ready</p>
              </div>

              <div class="storage-card">
                <h3>This Computer</h3>
                <p>Connect folders when needed.</p>
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
                <h3>Build</h3>
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

    requestAnimationFrame(() => this.attach(windowId));
  }

  private attach(windowId: string): void {
    const win = document.getElementById(windowId);
    if (!win) return;

    const tabs = win.querySelectorAll<HTMLElement>(".settings-tab");
    const panels = win.querySelectorAll<HTMLElement>(".settings-panel");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));

        tab.classList.add("active");

        win
          .querySelector(`.settings-panel[data-panel="${target}"]`)
          ?.classList.add("active");
      });
    });

    win.querySelectorAll<HTMLElement>("[data-theme]").forEach(button => {
      button.addEventListener("click", () => {
        const theme = button.dataset.theme || "system";

        if (theme === "dark") {
          document.documentElement.style.setProperty("--bg", "#07112c");
          document.documentElement.style.setProperty("--surface", "#13224a");
          document.documentElement.style.setProperty("--surface-2", "#1b2d5d");
        }

        if (theme === "light") {
          document.documentElement.style.setProperty("--bg", "#eef4ff");
          document.documentElement.style.setProperty("--surface", "#ffffff");
          document.documentElement.style.setProperty("--surface-2", "#dfe8f8");
        }

        if (theme === "system") {
          document.documentElement.style.removeProperty("--bg");
          document.documentElement.style.removeProperty("--surface");
          document.documentElement.style.removeProperty("--surface-2");
        }
      });
    });

    win.querySelectorAll<HTMLElement>(".accent").forEach(button => {
      button.addEventListener("click", () => {
        const color = button.dataset.color;
        if (color) {
          document.documentElement.style.setProperty("--accent", color);
        }
      });
    });
  }
}
