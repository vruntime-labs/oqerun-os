import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { Path } from "../vfs/Path";

type ExplorerEntry = {
  name: string;
  kind: "file" | "directory";
};

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
            data-cloud
            type="button"
            title="Open connected Google Drive"
          >
            Cloud
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
        await this.kernel.sys.listDetailed(
          this.currentPath
        );

      const sorted =
        [...entries].sort((a, b) => {
          if (a.kind !== b.kind) {
            return a.kind === "directory"
              ? -1
              : 1;
          }

          return a.name.localeCompare(
            b.name,
            undefined,
            { sensitivity: "base" }
          );
        });

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
            .map((entry) => {
              const fullPath =
                Path.join(
                  this.currentPath,
                  entry.name
                );

              const icon =
                entry.kind === "directory"
                  ? "▰"
                  : "▱";

              const typeLabel =
                entry.kind === "directory"
                  ? "Folder"
                  : "File";

              return `
                <button
                  class="explorer-item ${entry.kind}"
                  data-path="${this.escapeHtml(fullPath)}"
                  data-name="${this.escapeHtml(entry.name)}"
                  data-kind="${entry.kind}"
                  type="button"
                  title="${this.escapeHtml(typeLabel)}: ${this.escapeHtml(entry.name)}"
                >
                  <span
                    class="explorer-icon ${entry.kind}"
                    aria-hidden="true"
                  >
                    ${icon}
                  </span>

                  <span class="explorer-name">
                    ${this.escapeHtml(entry.name)}
                  </span>

                  <span class="explorer-type">
                    ${typeLabel}
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
        const folders =
          sorted.filter(
            entry =>
              entry.kind === "directory"
          ).length;

        const files =
          sorted.length - folders;

        status.textContent =
          `${sorted.length} item${sorted.length === 1 ? "" : "s"} · ${folders} folder${folders === 1 ? "" : "s"} · ${files} file${files === 1 ? "" : "s"}`;
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
      "[data-cloud]"
    )?.addEventListener(
      "click",
      () => {
        void this.refresh("/mnt/cloud/google-drive");
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

            const kind =
              item.dataset.kind;

            if (
              next &&
              kind === "directory"
            ) {
              void this.refresh(next);
            } else if (kind === "file") {
              this.kernel.notify.info(
                "Explorer",
                "Virtual files will open in Text Editor when that app is added."
              );
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

          const selected =
            win.querySelector<HTMLElement>(
              ".explorer-item.selected"
            );

          if (
            selected?.dataset.kind ===
            "directory"
          ) {
            void this.refresh(
              this.selectedPath
            );
          } else if (
            selected?.dataset.kind ===
            "file"
          ) {
            this.kernel.notify.info(
              "Explorer",
              "Virtual files will open in Text Editor when that app is added."
            );
          }
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
      [...win.querySelectorAll<HTMLElement>(
        ".explorer-item[data-path]"
      )].find(
        item =>
          item.dataset.path === path
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

  private describeError(
    error: unknown
  ): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "The filesystem could not be read.";
  }
}
