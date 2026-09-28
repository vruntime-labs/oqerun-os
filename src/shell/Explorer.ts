import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { Path } from "../vfs/Path";

export class Explorer {
  private readonly WINDOW_ID = "explorer";
  private currentPath = "/home/user";

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(path = "/home/user"): Promise<void> {
    this.currentPath = Path.normalize(path);

    this.wm.open({
      id: this.WINDOW_ID,
      title: "Explorer",
      width: 560,
      height: 380,
      x: 90,
      y: 55,
      content: this.render()
    });

    requestAnimationFrame(() => this.attachEvents());
  }

  private render(): string {
    const parts = this.currentPath.split("/").filter(Boolean);

    const breadcrumbs = [
      `<span class="breadcrumb" data-path="/">home</span>`,
      ...parts.slice(1).map((_, index) => {
        const p = "/" + parts.slice(0, index + 2).join("/");
        return `<span>/</span><span class="breadcrumb" data-path="${p}">${parts[index + 1]}</span>`;
      })
    ].join(" ");

    return `
      <div class="explorer">
        <div class="explorer-toolbar">
          <button class="explorer-btn" data-home>Home</button>
          <button class="explorer-btn" data-up>Up</button>

          <div class="explorer-path">
            ${breadcrumbs}
          </div>
        </div>

        <div class="explorer-divider"></div>

        <div class="explorer-list" id="explorer-list">
          Loading...
        </div>
      </div>
    `;
  }

  private async attachEvents(): Promise<void> {
    const win = document.getElementById(this.WINDOW_ID);
    if (!win) return;

    const list = win.querySelector("#explorer-list") as HTMLElement;
    if (!list) return;

    const entries = await this.kernel.sys.list(this.currentPath);

    if (entries.length === 0) {
      list.innerHTML = `<div class="explorer-item">This folder is empty.</div>`;
    } else {
      list.innerHTML = entries
        .map(name => {
          const full = Path.join(this.currentPath, name);

          return `
            <div class="explorer-item" data-folder="${full}">
              <span class="explorer-icon">📁</span>
              <span class="explorer-name">${name}</span>
            </div>
          `;
        })
        .join("");
    }

    win.querySelector("[data-home]")?.addEventListener("click", () => {
      this.refresh("/home/user");
    });

    win.querySelector("[data-up]")?.addEventListener("click", () => {
      const parent = Path.dirname(this.currentPath);
      this.refresh(parent === "" ? "/" : parent);
    });

    win.querySelectorAll(".breadcrumb").forEach(el => {
      el.addEventListener("click", () => {
        this.refresh((el as HTMLElement).dataset.path || "/");
      });
    });

    win.querySelectorAll(".explorer-item[data-folder]").forEach(el => {
      el.addEventListener("dblclick", () => {
        const next = (el as HTMLElement).dataset.folder;
        if (next) this.refresh(next);
      });
    });
  }

  private async refresh(path: string): Promise<void> {
    this.currentPath = Path.normalize(path);

    const win = document.getElementById(this.WINDOW_ID);
    if (!win) return;

    const content = win.querySelector(".window-content") as HTMLElement;
    if (!content) return;

    content.innerHTML = this.render();

    await this.attachEvents();
  }
}
