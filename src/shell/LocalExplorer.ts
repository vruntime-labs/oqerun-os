import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

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

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(handle: FileSystemDirectoryHandle): Promise<void> {
    this.rootHandle = handle;
    this.currentHandle = handle;
    this.pathParts = [handle.name || "This Computer"];

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
      void this.attachEvents();
    });
  }

  private render(): string {
    const canGoUp = this.pathParts.length > 1;

    return `
      <div class="explorer local-explorer">
        <div class="explorer-toolbar">
          <button class="explorer-btn" data-local-up ${canGoUp ? "" : "disabled"}>Up</button>
          <button class="explorer-btn" data-local-refresh>Refresh</button>

          <div class="explorer-path">
            ${this.pathParts
              .map((part, index) =>
                index === this.pathParts.length - 1
                  ? `<span class="breadcrumb current">${this.escapeHtml(part)}</span>`
                  : `<span class="breadcrumb">${this.escapeHtml(part)}</span><span>/</span>`
              )
              .join("")}
          </div>
        </div>

        <div class="explorer-divider"></div>

        <div class="explorer-list" id="local-explorer-list">
          <div class="explorer-item">Loading...</div>
        </div>
      </div>
    `;
  }

  private async attachEvents(): Promise<void> {
    const win = document.getElementById(this.WINDOW_ID);
    if (!win || !this.currentHandle) return;

    const list = win.querySelector("#local-explorer-list") as HTMLElement | null;
    if (!list) return;

    try {
      const entries: FileSystemHandle[] = [];

      for await (const [, handle] of this.currentHandle.entries()) {
        entries.push(handle);
      }

      entries.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "directory" ? -1 : 1;
        }

        return a.name.localeCompare(b.name, undefined, {
          sensitivity: "base"
        });
      });

      if (entries.length === 0) {
        list.innerHTML = `
          <div class="explorer-empty">
            <strong>This folder is empty</strong>
            <span>No files or folders were found here.</span>
          </div>
        `;
      } else {
        list.innerHTML = entries
          .map(
            (entry) => `
              <button
                class="explorer-item local-explorer-item"
                type="button"
                data-name="${this.escapeAttribute(entry.name)}"
                data-kind="${entry.kind}"
              >
                <span class="explorer-icon ${entry.kind === "directory" ? "folder" : "file"}" aria-hidden="true">
                  ${entry.kind === "directory" ? "▰" : "▱"}
                </span>
                <span class="explorer-name">${this.escapeHtml(entry.name)}</span>
              </button>
            `
          )
          .join("");
      }
    } catch (error) {
      list.innerHTML = `
        <div class="explorer-empty error">
          <strong>Unable to read this folder</strong>
          <span>${this.escapeHtml(this.describeError(error))}</span>
        </div>
      `;
    }

    win.querySelector<HTMLButtonElement>("[data-local-up]")
      ?.addEventListener("click", () => {
        void this.goUp();
      });

    win.querySelector<HTMLButtonElement>("[data-local-refresh]")
      ?.addEventListener("click", () => {
        void this.refresh();
      });

    win.querySelectorAll<HTMLButtonElement>(".local-explorer-item")
      .forEach((item) => {
        item.addEventListener("dblclick", () => {
          void this.openEntry(
            item.dataset.name || "",
            item.dataset.kind || ""
          );
        });
      });
  }

  private async openEntry(
    name: string,
    kind: string
  ): Promise<void> {
    if (!this.currentHandle || !name) return;

    if (kind === "directory") {
      try {
        this.currentHandle =
          await this.currentHandle.getDirectoryHandle(name);

        this.pathParts.push(name);

        await this.refresh();
      } catch (error) {
        this.kernel.notify.error(
          "Open folder failed",
          this.describeError(error)
        );
      }

      return;
    }

    this.kernel.notify.info(
      "File access",
      `"${name}" is visible here. File Viewer will be connected next.`
    );
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
        await this.rootHandle.resolve(this.currentHandle);

      if (!relativePath || relativePath.length === 0) {
        return;
      }

      const parentParts =
        relativePath.slice(0, -1);

      let parentHandle =
        this.rootHandle;

      for (const part of parentParts) {
        parentHandle =
          await parentHandle.getDirectoryHandle(part);
      }

      this.currentHandle =
        parentHandle;

      this.pathParts = [
        this.rootHandle.name || "This Computer",
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
      document.getElementById(this.WINDOW_ID);

    const content =
      win?.querySelector(".window-content") as HTMLElement | null;

    if (!content) return;

    content.innerHTML =
      this.render();

    await this.attachEvents();
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }

  private describeError(error: unknown): string {
    if (error instanceof DOMException) {
      return error.message || error.name;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "The browser could not access this folder.";
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
