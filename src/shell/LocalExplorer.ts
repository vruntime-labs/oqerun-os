import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { FileViewer } from "./FileViewer";

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
};

export class LocalExplorer {
  private readonly WINDOW_ID = "computer-files";

  private rootHandle: FileSystemDirectoryHandle | null = null;
  private currentHandle: FileSystemDirectoryHandle | null = null;
  private pathParts: string[] = [];

  /*
   * Keep the exact handles returned by entries().
   *
   * This is more reliable than rendering a filename and then trying
   * to resolve that filename again with getDirectoryHandle() or
   * getFileHandle(). The browser has already given us the live handle,
   * so navigation and file opening can use that exact object.
   */
  private entryHandles = new Map<string, FileSystemHandle>();

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(
    handle: FileSystemDirectoryHandle
  ): Promise<void> {
    this.rootHandle = handle;
    this.currentHandle = handle;
    this.pathParts = [
      handle.name || "This Computer"
    ];

    this.wm.open({
      id: this.WINDOW_ID,
      title: "This Computer",
      width: 760,
      height: 500,
      x: 110,
      y: 55,
      content: this.render()
    });

    requestAnimationFrame(() => {
      void this.loadCurrentDirectory();
    });
  }

  private render(): string {
    const canGoUp =
      this.pathParts.length > 1;

    return `
      <div class="explorer local-explorer">
        <div class="explorer-toolbar">
          <button
            class="explorer-btn"
            data-local-up
            type="button"
            ${canGoUp ? "" : "disabled"}
          >
            Up
          </button>

          <button
            class="explorer-btn"
            data-local-refresh
            type="button"
          >
            Refresh
          </button>

          <div class="explorer-path">
            ${this.pathParts
              .map((part, index) =>
                index === this.pathParts.length - 1
                  ? `
                    <span class="breadcrumb current">
                      ${this.escapeHtml(part)}
                    </span>
                  `
                  : `
                    <span class="breadcrumb">
                      ${this.escapeHtml(part)}
                    </span>
                    <span>/</span>
                  `
              )
              .join("")}
          </div>
        </div>

        <div class="explorer-divider"></div>

        <div
          class="explorer-list"
          id="local-explorer-list"
        >
          <div class="explorer-item">
            Loading...
          </div>
        </div>
      </div>
    `;
  }

  private async loadCurrentDirectory(): Promise<void> {
    const win =
      document.getElementById(
        this.WINDOW_ID
      );

    if (!win || !this.currentHandle) {
      return;
    }

    const list =
      win.querySelector(
        "#local-explorer-list"
      ) as HTMLElement | null;

    if (!list) {
      return;
    }

    this.entryHandles.clear();

    try {
      /*
       * entries() is the authoritative listing for the selected
       * directory. Store each returned handle directly so opening
       * an item does not require another filesystem lookup.
       */
      const entries: FileSystemHandle[] = [];

      for await (
        const [, handle]
        of this.currentHandle.entries()
      ) {
        entries.push(handle);
      }

      entries.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "directory"
            ? -1
            : 1;
        }

        return a.name.localeCompare(
          b.name,
          undefined,
          {
            sensitivity: "base"
          }
        );
      });

      if (entries.length === 0) {
        list.innerHTML = `
          <div class="explorer-empty">
            <strong>
              This folder is empty
            </strong>
            <span>
              No files or folders were found here.
            </span>
          </div>
        `;
      } else {
        list.innerHTML =
          entries
            .map((entry, index) => {
              const key =
                String(index);

              this.entryHandles.set(
                key,
                entry
              );

              return `
                <button
                  class="explorer-item local-explorer-item"
                  type="button"
                  data-entry-key="${key}"
                >
                  <span
                    class="explorer-icon ${entry.kind === "directory" ? "folder" : "file"}"
                    aria-hidden="true"
                  >
                    ${entry.kind === "directory"
                      ? "▰"
                      : "▱"}
                  </span>

                  <span class="explorer-name">
                    ${this.escapeHtml(entry.name)}
                  </span>
                </button>
              `;
            })
            .join("");
      }

      this.attachEvents(win);
    } catch (error) {
      list.innerHTML = `
        <div class="explorer-empty error">
          <strong>
            Unable to read this folder
          </strong>
          <span>
            ${this.escapeHtml(
              this.describeError(error)
            )}
          </span>
        </div>
      `;

      this.attachEvents(win);
    }
  }

  private attachEvents(
    win: HTMLElement
  ): void {
    win.querySelector<HTMLButtonElement>(
      "[data-local-up]"
    )?.addEventListener(
      "click",
      () => {
        void this.goUp();
      }
    );

    win.querySelector<HTMLButtonElement>(
      "[data-local-refresh]"
    )?.addEventListener(
      "click",
      () => {
        void this.refresh();
      }
    );

    const list =
      win.querySelector(
        "#local-explorer-list"
      ) as HTMLElement | null;

    if (!list) {
      return;
    }

    /*
     * Event delegation keeps navigation stable even after the
     * directory contents are replaced during refresh.
     */
    list.addEventListener(
      "click",
      (event) => {
        const target =
          (event.target as HTMLElement | null)
            ?.closest<HTMLButtonElement>(
              ".local-explorer-item"
            );

        if (!target) {
          return;
        }

        /*
         * Folder navigation is intentionally handled on a normal
         * click. Files use double-click, matching desktop Explorer
         * behavior while keeping folder navigation dependable.
         */
        const key =
          target.dataset.entryKey || "";

        const handle =
          this.entryHandles.get(key);

        if (!handle) {
          return;
        }

        if (handle.kind === "directory") {
          void this.openHandle(handle);
        }
      }
    );

    list.addEventListener(
      "dblclick",
      (event) => {
        const target =
          (event.target as HTMLElement | null)
            ?.closest<HTMLButtonElement>(
              ".local-explorer-item"
            );

        if (!target) {
          return;
        }

        const key =
          target.dataset.entryKey || "";

        const handle =
          this.entryHandles.get(key);

        if (!handle) {
          return;
        }

        if (handle.kind === "file") {
          void this.openHandle(handle);
        }
      }
    );

    list.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        const target =
          (event.target as HTMLElement | null)
            ?.closest<HTMLButtonElement>(
              ".local-explorer-item"
            );

        if (!target) {
          return;
        }

        event.preventDefault();

        const key =
          target.dataset.entryKey || "";

        const handle =
          this.entryHandles.get(key);

        if (!handle) {
          return;
        }

        void this.openHandle(handle);
      }
    );
  }

  private async openHandle(
    handle: FileSystemHandle
  ): Promise<void> {
    if (handle.kind === "directory") {
      try {
        /*
         * Use the exact child directory handle returned by entries().
         * No second getDirectoryHandle() lookup is necessary.
         */
        this.currentHandle =
          handle as FileSystemDirectoryHandle;

        this.pathParts.push(
          handle.name
        );

        await this.refresh();
      } catch (error) {
        this.kernel.notify.error(
          "Open folder failed",
          this.describeError(error)
        );
      }

      return;
    }

    try {
      await new FileViewer(
        this.kernel,
        this.wm
      ).open(
        handle as FileSystemFileHandle
      );
    } catch (error) {
      this.kernel.notify.error(
        "Open file failed",
        this.describeError(error)
      );
    }
  }

  private async goUp(): Promise<void> {
    if (
      !this.currentHandle ||
      !this.rootHandle ||
      this.pathParts.length <= 1
    ) {
      return;
    }

    try {
      const relativePath =
        await this.rootHandle.resolve(
          this.currentHandle
        );

      if (
        !relativePath ||
        relativePath.length === 0
      ) {
        return;
      }

      const parentParts =
        relativePath.slice(0, -1);

      let parentHandle =
        this.rootHandle;

      for (
        const part of parentParts
      ) {
        parentHandle =
          await parentHandle.getDirectoryHandle(
            part
          );
      }

      this.currentHandle =
        parentHandle;

      this.pathParts = [
        this.rootHandle.name ||
          "This Computer",
        ...parentParts
      ];

      await this.refresh();
    } catch (error) {
      this.kernel.notify.error(
        "Navigation failed",
        this.describeError(error)
      );
    }
  }

  private async refresh(): Promise<void> {
    const win =
      document.getElementById(
        this.WINDOW_ID
      );

    const content =
      win?.querySelector(
        ".window-content"
      ) as HTMLElement | null;

    if (!content) {
      return;
    }

    content.innerHTML =
      this.render();

    await this.loadCurrentDirectory();
  }

  private escapeHtml(
    value: string
  ): string {
    return value
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  private describeError(
    error: unknown
  ): string {
    if (
      error instanceof DOMException
    ) {
      return (
        error.message ||
        error.name
      );
    }

    if (
      error instanceof Error
    ) {
      return error.message;
    }

    return (
      "The browser could not access this folder."
    );
  }
}

export async function pickLocalDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const picker =
    (window as DirectoryPickerWindow)
      .showDirectoryPicker;

  if (!picker) {
    return null;
  }

  try {
    return await picker({
      id: "oqerun-computer",
      mode: "read"
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      return null;
    }

    throw error;
  }
}
