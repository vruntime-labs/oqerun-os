import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { Path } from "../vfs/Path";

export class Explorer {
  private readonly WINDOW_ID = "explorer";
  private currentPath = "/home/user";
  private selectedPath: string | null = null;

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(path = "/home/user"): Promise<void> {
    this.currentPath = Path.normalize(path);
    this.selectedPath = null;

    this.wm.open({
      id: this.WINDOW_ID,
      title: "Explorer",
      width: 700,
      height: 460,
      x: 90,
      y: 55,
      content: this.render()
    });

    requestAnimationFrame(() => {
      void this.attachEvents();
    });
  }

  private render(): string {
    const parts = this.currentPath
      .split("/")
      .filter(Boolean);

    const breadcrumbs = [
      `<button class="breadcrumb" data-path="/" type="button">Home</button>`,
      ...parts.map((part, index) => {
        const path =
          "/" +
          parts
            .slice(0, index + 1)
            .join("/");

        return `
          <span class="breadcrumb-separator">/</span>
          <button
            class="breadcrumb"
            data-path="${this.escapeHtml(path)}"
            type="button"
          >
            ${this.escapeHtml(part)}
          </button>
        `;
      })
    ].join("");

    const isHome =
      this.currentPath === "/home/user";

    const isRoot =
      this.currentPath === "/";

    return `
      <div class="explorer">
        <div class="explorer-toolbar">
          <button
            class="explorer-btn explorer-nav-btn"
            data-home
            type="button"
            ${isHome ? "disabled" : ""}
            title="Go to Home"
          >
            Home
          </button>

          <button
            class="explorer-btn explorer-nav-btn"
            data-up
            type="button"
            ${isRoot ? "disabled" : ""}
            title="Go to parent folder"
          >
            Up
          </button>

          <button
            class="explorer-btn explorer-nav-btn"
            data-refresh
            type="button"
            title="Refresh folder"
          >
            Refresh
          </button>

          <div
            class="explorer-path"
            aria-label="Current location"
          >
            ${breadcrumbs}
          </div>
        </div>

        <div class="explorer-divider"></div>

        <div
          class="explorer-list"
          id="explorer-list"
          tabindex="0"
          aria-label="Files and folders"
        >
          <div class="explorer-empty">
            <strong>Loading...</strong>
          </div>
        </div>

        <div
          class="explorer-status"
          id="explorer-status"
        >
          Loading...
        </div>
      </div>
    `;
  }

  private async attachEvents(): Promise<void> {
    const win =
      document.getElementById(
        this.WINDOW_ID
      );

    if (!win) return;

    const list =
      win.querySelector(
        "#explorer-list"
      ) as HTMLElement | null;

    if (!list) return;

    try {
      const entries =
        await this.kernel.sys.list(
          this.currentPath
        );

      const sorted =
        [...entries].sort(
          (a, b) =>
            a.localeCompare(
              b,
              undefined,
              { sensitivity: "base" }
            )
        );

      if (sorted.length === 0) {
        list.innerHTML = `
          <div class="explorer-empty">
            <strong>This folder is empty</strong>
            <span>No files or folders are stored here yet.</span>
          </div>
        `;
      } else {
        list.innerHTML =
          sorted
            .map((name) => {
              const fullPath =
                Path.join(
                  this.currentPath,
                  name
                );

              return `
                <button
                  class="explorer-item"
                  data-path="${this.escapeHtml(fullPath)}"
                  data-name="${this.escapeHtml(name)}"
                  type="button"
                >
                  <span
                    class="explorer-icon"
                    aria-hidden="true"
                  >
                    ◈
                  </span>

                  <span class="explorer-name">
                    ${this.escapeHtml(name)}
                  </span>
                </button>
              `;
            })
            .join("");
      }

      const status =
        win.querySelector(
          "#explorer-status"
        );

      if (status) {
        status.textContent =
          sorted.length === 1
            ? "1 item"
            : `${sorted.length} items`;
      }
    } catch (error) {
      list.innerHTML = `
        <div class="explorer-empty error">
          <strong>Unable to open this folder</strong>
          <span>${this.escapeHtml(
            this.describeError(error)
          )}</span>
        </div>
      `;

      const status =
        win.querySelector(
          "#explorer-status"
        );

      if (status) {
        status.textContent =
          "Folder access error";
      }
    }

    win.querySelector<HTMLButtonElement>(
      "[data-home]"
    )?.addEventListener(
      "click",
      () => {
        void this.refresh(
          "/home/user"
        );
      }
    );

    win.querySelector<HTMLButtonElement>(
      "[data-up]"
    )?.addEventListener(
      "click",
      () => {
        const parent =
          Path.dirname(
            this.currentPath
          );

        void this.refresh(
          parent === ""
            ? "/"
            : parent
        );
      }
    );

    win.querySelector<HTMLButtonElement>(
      "[data-refresh]"
    )?.addEventListener(
      "click",
      () => {
        void this.refresh(
          this.currentPath
        );
      }
    );

    win.querySelectorAll<HTMLButtonElement>(
      ".breadcrumb"
    ).forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            void this.refresh(
              button.dataset.path ||
                "/"
            );
          }
        );
      }
    );

    win.querySelectorAll<HTMLButtonElement>(
      ".explorer-item[data-path]"
    ).forEach(
      (item) => {
        item.addEventListener(
          "click",
          () => {
            this.selectItem(
              win,
              item.dataset.path || null
            );
          }
        );

        item.addEventListener(
          "dblclick",
          () => {
            const next =
              item.dataset.path;

            if (next) {
              void this.refresh(next);
            }
          }
        );
      }
    );

    list.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" &&
          this.selectedPath
        ) {
          event.preventDefault();

          void this.refresh(
            this.selectedPath
          );
        }
      }
    );
  }

  private selectItem(
    win: HTMLElement,
    path: string | null
  ): void {
    this.selectedPath = path;

    win
      .querySelectorAll(
        ".explorer-item.selected"
      )
      .forEach(
        (item) => {
          item.classList.remove(
            "selected"
          );
        }
      );

    if (!path) return;

    const selected =
      win.querySelector<HTMLElement>(
        `.explorer-item[data-path="${this.escapeAttribute(
          path
        )}"]`
      );

    selected?.classList.add(
      "selected"
    );
  }

  private async refresh(
    path: string
  ): Promise<void> {
    this.currentPath =
      Path.normalize(path);

    this.selectedPath = null;

    const win =
      document.getElementById(
        this.WINDOW_ID
      );

    if (!win) return;

    const content =
      win.querySelector(
        ".window-content"
      ) as HTMLElement | null;

    if (!content) return;

    content.innerHTML =
      this.render();

    await this.attachEvents();
  }

  private escapeHtml(
    value: string
  ): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  private escapeAttribute(
    value: string
  ): string {
    return this.escapeHtml(value);
  }

  private describeError(
    error: unknown
  ): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "The filesystem could not be read.";
  }
}
