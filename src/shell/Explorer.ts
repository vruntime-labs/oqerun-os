import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class Explorer {
  constructor(
    private kernel: Kernel,import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class Explorer {
  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(path = "/home/user"): Promise<void> {
    const items = await this.kernel.sys.list(path);
    const windowId = `explorer-${path.replace(/\//g, "-")}`;

    const list =
      items.length === 0
        ? "<p>This folder is empty.</p>"
        : items
            .map((item) => {
              const nextPath = `${path}/${item}`.replace(/\/+/g, "/");

              return `
                <div class="explorer-item" data-path="${nextPath}">
                  📁 ${item}
                </div>
              `;
            })
            .join("");

    this.wm.open({
      id: windowId,
      title: `Explorer — ${path}`,
      width: 720,
      height: 480,
      x: 120,
      y: 70,
      content: `
        <div class="explorer">
          <div class="explorer-toolbar">
            <strong>${path}</strong>
          </div>

          <div class="explorer-list">
            ${list}
          </div>
        </div>
      `
    });

    requestAnimationFrame(() => {
      const win = document.getElementById(windowId);
      if (!win) return;

      win.querySelectorAll<HTMLElement>(".explorer-item").forEach((item) => {
        item.addEventListener("dblclick", () => {
          const next = item.dataset.path;
          if (next) this.open(next);
        });
      });
    });
  }
}
    private wm: WindowManager
  ) {}

  async open(path = "/home/user"): Promise<void> {
    const items = await this.kernel.sys.list(path);

    const list =
      items.length === 0
        ? "<p>This folder is empty.</p>"
        : items
            .map(
              (item) => `
                <div class="explorer-item">
                  📄 ${item}
                </div>
              `
            )
            .join("");

    this.wm.open({
      id: `explorer-${path}`,
      title: `Explorer — ${path}`,
      width: 720,
      height: 480,
      x: 120,
      y: 70,
      content: `
        <div class="explorer">
          <div class="explorer-toolbar">
            <strong>${path}</strong>
          </div>

          <div class="explorer-list">
            ${list}
          </div>
        </div>
      `
    });
  }
}
