import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { FileViewer } from "./FileViewer";

type PermissionCapableHandle = FileSystemHandle & {
  queryPermission?: (descriptor?: {
    mode?: "read" | "readwrite";
  }) => Promise<PermissionState>;

  requestPermission?: (descriptor?: {
    mode?: "read" | "readwrite";
  }) => Promise<PermissionState>;
};

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
   * The browser has already resolved these entries for us, so
   * navigation and file opening use the live handles directly.
   */
  private entryHandles = new Map<string, FileSystemHandle>();

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(handle: FileSystemDirectoryHandle): Promise<void> {
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
      const entries: FileSystemHandle[] = [];

      /*
       * entries() is the authoritative directory listing.
       * A permission/access failure must remain an explicit error;
       * it must never be presented to the user as an empty folder.
       */
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
              const key = String(index);

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

  private attachEvents(win: HTMLElement): void {
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
        /*
         * Refresh is a real user activation. If the browser has moved
         * the handle into a prompt state, this gives us a valid place
         * to request read permission.
         */
        void this.refresh(true);
      }
    );

    const list =
      win.querySelector(
        "#local-explorer-list"
      ) as HTMLElement | null;

    if (!list) {
      return;
    }

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

        const key =
          target.dataset.entryKey || "";

        const handle =
          this.entryHandles.get(key);

        if (!handle) {
          return;
        }

        if (handle.kind === "directory") {
          /*
           * Folder clicks are direct user activation, so a permission
           * request is allowed here if the browser reports "prompt".
           */
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
    const permissionGranted =
      await this.ensureReadPermission(handle);

    if (!permissionGranted) {
      return;
    }

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

  private async ensureReadPermission(
    handle: FileSystemHandle
  ): Promise<boolean> {
    const permissionHandle =
      handle as PermissionCapableHandle;

    /*
     * Some browsers expose the file handles but do not expose the
     * permission-query methods. In that case, let the actual read
     * operation determine access.
     */
    if (
      !permissionHandle.queryPermission
    ) {
      return true;
    }

    try {
      const state =
        await permissionHandle.queryPermission({
          mode: "read"
        });

      if (state === "granted") {
        return true;
      }

      if (
        state === "prompt" &&
        permissionHandle.requestPermission
      ) {
        const requested =
          await permissionHandle.requestPermission({
            mode: "read"
          });

        if (requested === "granted") {
          return true;
        }

        this.kernel.notify.warning(
          "Permission required",
          "Oqerun needs read access to open this folder or file."
        );

        return false;
      }

      this.kernel.notify.warning(
        "Permission denied",
        "The browser did not grant Oqerun read access to this item."
      );

      return false;
    } catch (error) {
      this.kernel.notify.error(
        "Permission check failed",
        this.describeError(error)
      );

      return false;
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

      const permissionGranted =
        await this.ensureReadPermission(
          parentHandle
        );

      if (!permissionGranted) {
        return;
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

  private async refresh(
    requestPermission = false
  ): Promise<void> {
    if (
      requestPermission &&
      this.currentHandle
    ) {
      const permissionGranted =
        await this.ensureReadPermission(
          this.currentHandle
        );

      if (!permissionGranted) {
        return;
      }
    }

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
      if (error.name === "NotAllowedError") {
        return (
          "The browser denied read access to this folder."
        );
      }

      if (error.name === "NotFoundError") {
        return (
          "The selected folder or file could not be found."
        );
      }

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
