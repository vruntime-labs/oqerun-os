import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class Explorer {
  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(path = "/home/user"): Promise<void> {
    const items = await this.kernel.sys.list(path);
    const windowId = `explorer-${path.replace(/\//g, "-")}`;

    const parentPath = this.getParentPath(path);

    const breadcrumbs = this.buildBreadcrumbs(path);

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
            <button class="explorer-btn" data-home>Home</button>
            <button class="explorer-btn" data-up>Up</button>

            <div class="explorer-path">
              ${breadcrumbs}
            </div>
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

      win.querySelector<HTMLElement>("[data-home]")
        ?.addEventListener("click", () => {
          this.open("/home/user");
        });

      win.querySelector<HTMLElement>("[data-up]")
        ?.addEventListener("click", () => {
          this.open(parentPath);
        });

      win.querySelectorAll<HTMLElement>(".breadcrumb").forEach((crumb) => {
        crumb.addEventListener("click", () => {
          const target = crumb.dataset.path;
          if (target) this.open(target);
        });
      });
    });
  }

  private getParentPath(path: string): string {
    if (path === "/" || path === "/home") return "/home/user";

    const parts = path.split("/").filter(Boolean);
    parts.pop();

    if (parts.length === 0) return "/home/user";

    return "/" + parts.join("/");
  }

  private buildBreadcrumbs(path: string): string {
    const parts = path.split("/").filter(Boolean);

    if (parts.length === 0) {
      return `<span class="breadcrumb" data-path="/">/</span>`;
    }

    let current = "";

    return parts
      .map((part) => {
        current += "/" + part;

        return `
          <span class="breadcrumb" data-path="${current}">
            ${part}
          </span>
        `;
      })
      .join(" / ");
  }
}
