import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { Path } from "../vfs/Path";

type ExplorerEntry = {
  name: string;
  kind: "file" | "directory";
};

type TrashRecord = {
  id: string;
  name: string;
  kind: "file" | "directory";
  originalPath: string;
  trashPath: string;
  deletedAt: string;
};

const TRASH_PATH = "/home/user/Trash";
const TRASH_META_PATH = "/home/user/Trash/.oqtrash.json";

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

    const isTrash =
      this.currentPath === TRASH_PATH;

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
            data-trash
            type="button"
            title="Open Trash"
          >
            Trash
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

          <button class="explorer-btn" data-new-folder type="button" ${isTrash ? "hidden" : ""}>New Folder</button>
          <button class="explorer-btn" data-new-file type="button" ${isTrash ? "hidden" : ""}>New File</button>
          <button class="explorer-btn" data-rename type="button" disabled ${isTrash ? "hidden" : ""}>Rename</button>
          <button class="explorer-btn" data-restore type="button" disabled ${isTrash ? "" : "hidden"}>Restore</button>
          <button class="explorer-btn" data-delete-permanent type="button" disabled ${isTrash ? "" : "hidden"}>Delete Permanently</button>
          <button class="explorer-btn" data-empty-trash type="button" ${isTrash ? "" : "hidden"}>Empty Trash</button>
          <button class="explorer-btn" data-delete type="button" disabled ${isTrash ? "hidden" : ""}>Delete</button>

          <input
            class="explorer-search"
            data-search
            type="search"
            placeholder="Search this folder"
            autocomplete="off"
          />

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
            .filter((entry) => !isTrash || entry.name !== ".oqtrash.json")
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

    const renameButton = win.querySelector<HTMLButtonElement>("[data-rename]");
    const deleteButton = win.querySelector<HTMLButtonElement>("[data-delete]");
    const restoreButton = win.querySelector<HTMLButtonElement>("[data-restore]");
    const permanentDeleteButton = win.querySelector<HTMLButtonElement>("[data-delete-permanent]");

    win.querySelector<HTMLInputElement>("[data-search]")?.addEventListener("input", (event) => {
      const query = (event.target as HTMLInputElement).value.trim().toLocaleLowerCase();
      win.querySelectorAll<HTMLElement>(".explorer-item").forEach((item) => {
        item.hidden = !!query && !(item.dataset.name ?? "").toLocaleLowerCase().includes(query);
      });
    });

    win.querySelector<HTMLButtonElement>("[data-new-folder]")?.addEventListener("click", async () => {
      const name = window.prompt("New folder name", "New Folder")?.trim();
      if (!name) return;
      try {
        await this.kernel.sys.mkdir(Path.join(this.currentPath, name));
        await this.refresh(this.currentPath);
      } catch (error) {
        this.kernel.notify.info("Explorer", this.describeError(error));
      }
    });

    win.querySelector<HTMLButtonElement>("[data-new-file]")?.addEventListener("click", async () => {
      const name = window.prompt("New file name", "New Text File.oqtxt")?.trim();
      if (!name) return;
      try {
        await this.kernel.sys.write(Path.join(this.currentPath, name), "");
        await this.refresh(this.currentPath);
      } catch (error) {
        this.kernel.notify.info("Explorer", this.describeError(error));
      }
    });

    renameButton?.addEventListener("click", async () => {
      if (!this.selectedPath) return;
      const currentName = Path.basename(this.selectedPath);
      const nextName = window.prompt("Rename", currentName)?.trim();
      if (!nextName || nextName === currentName) return;

      try {
        await this.kernel.sys.rename(
          this.selectedPath,
          Path.join(this.currentPath, nextName)
        );
        await this.refresh(this.currentPath);
      } catch (error) {
        this.kernel.notify.info("Explorer", this.describeError(error));
      }
    });

    deleteButton?.addEventListener("click", async () => {
      if (!this.selectedPath) return;
      const currentName = Path.basename(this.selectedPath);
      if (!window.confirm(`Move "${currentName}" to Trash?`)) return;

      try {
        await this.moveToTrash(this.selectedPath);
        await this.refresh(this.currentPath);
      } catch (error) {
        this.kernel.notify.info("Trash", this.describeError(error));
      }
    });

    restoreButton?.addEventListener("click", async () => {
      if (!this.selectedPath) return;
      try {
        await this.restoreFromTrash(this.selectedPath);
        await this.refresh(TRASH_PATH);
      } catch (error) {
        this.kernel.notify.info("Trash", this.describeError(error));
      }
    });

    permanentDeleteButton?.addEventListener("click", async () => {
      if (!this.selectedPath) return;
      const currentName = Path.basename(this.selectedPath);
      if (!window.confirm(`Permanently delete "${currentName}"? This cannot be undone.`)) return;

      try {
        await this.kernel.sys.remove(this.selectedPath);
        await this.removeTrashRecord(this.selectedPath);
        await this.refresh(TRASH_PATH);
      } catch (error) {
        this.kernel.notify.info("Trash", this.describeError(error));
      }
    });

    win.querySelector<HTMLButtonElement>("[data-empty-trash]")?.addEventListener("click", async () => {
      const records = await this.loadTrashRecords();
      if (!records.length) {
        this.kernel.notify.info("Trash", "Trash is already empty.");
        return;
      }

      if (!window.confirm("Empty Trash? All items will be permanently deleted.")) return;

      try {
        const entries = await this.kernel.sys.listDetailed(TRASH_PATH);
        for (const entry of entries) {
          if (entry.name === ".oqtrash.json") continue;
          await this.kernel.sys.remove(Path.join(TRASH_PATH, entry.name));
        }
        await this.saveTrashRecords([]);
        await this.refresh(TRASH_PATH);
        this.kernel.notify.info("Trash", "Trash emptied.");
      } catch (error) {
        this.kernel.notify.info("Trash", this.describeError(error));
      }
    });

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
              void this.openFile(next);
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
            void this.openFile(this.selectedPath);
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

    const winControls = win;
    winControls.querySelector<HTMLButtonElement>("[data-rename]")?.toggleAttribute("disabled", !path);
    winControls.querySelector<HTMLButtonElement>("[data-delete]")?.toggleAttribute("disabled", !path);
    winControls.querySelector<HTMLButtonElement>("[data-restore]")?.toggleAttribute("disabled", !path);
    winControls.querySelector<HTMLButtonElement>("[data-delete-permanent]")?.toggleAttribute("disabled", !path);

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

  private async loadTrashRecords(): Promise<TrashRecord[]> {
    try {
      if (!(await this.kernel.sys.exists(TRASH_META_PATH))) {
        return [];
      }

      const raw = await this.kernel.sys.read(TRASH_META_PATH);
      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) return [];

      return parsed.filter((item): item is TrashRecord => {
        if (!item || typeof item !== "object") return false;
        const record = item as Partial<TrashRecord>;
        return (
          typeof record.id === "string" &&
          typeof record.name === "string" &&
          (record.kind === "file" || record.kind === "directory") &&
          typeof record.originalPath === "string" &&
          typeof record.trashPath === "string" &&
          typeof record.deletedAt === "string"
        );
      });
    } catch {
      return [];
    }
  }

  private async saveTrashRecords(records: TrashRecord[]): Promise<void> {
    await this.kernel.sys.mkdir(TRASH_PATH);
    await this.kernel.sys.write(
      TRASH_META_PATH,
      JSON.stringify(records, null, 2)
    );
  }

  private async moveToTrash(sourcePath: string): Promise<void> {
    const normalizedSource = Path.normalize(sourcePath);

    if (
      normalizedSource === TRASH_PATH ||
      normalizedSource.startsWith(TRASH_PATH + "/")
    ) {
      throw new Error("Items already in Trash cannot be moved to Trash again.");
    }

    await this.kernel.sys.mkdir(TRASH_PATH);

    const entries = await this.kernel.sys.listDetailed(TRASH_PATH);
    const existingNames = new Set(
      entries
        .filter((entry) => entry.name !== ".oqtrash.json")
        .map((entry) => entry.name)
    );

    const originalName = Path.basename(normalizedSource);
    let trashName = originalName;
    let suffix = 1;

    while (existingNames.has(trashName)) {
      trashName = `${originalName} (${suffix++})`;
    }

    const trashPath = Path.join(TRASH_PATH, trashName);
    const sourceEntries = await this.kernel.sys.listDetailed(Path.dirname(normalizedSource));
    const kind =
      sourceEntries.find((entry) => entry.name === originalName)?.kind ?? "file";

    await this.kernel.sys.rename(normalizedSource, trashPath);

    const records = await this.loadTrashRecords();
    records.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: originalName,
      kind,
      originalPath: normalizedSource,
      trashPath,
      deletedAt: new Date().toISOString()
    });

    await this.saveTrashRecords(records);
    this.kernel.notify.info("Trash", `Moved "${originalName}" to Trash.`);
  }

  private async restoreFromTrash(trashPath: string): Promise<void> {
    const records = await this.loadTrashRecords();
    const record = records.find((item) => item.trashPath === trashPath);

    if (!record) {
      throw new Error("Trash metadata for this item is missing.");
    }

    let destination = record.originalPath;

    if (await this.kernel.sys.exists(destination)) {
      const directory = Path.dirname(record.originalPath);
      const extension = Path.extname(record.name);
      const stem = extension
        ? record.name.slice(0, -extension.length)
        : record.name;

      let candidate = Path.join(
        directory,
        `${stem} (restored)${extension}`
      );
      let counter = 2;

      while (await this.kernel.sys.exists(candidate)) {
        candidate = Path.join(
          directory,
          `${stem} (restored ${counter++})${extension}`
        );
      }

      destination = candidate;
    }

    await this.kernel.sys.rename(trashPath, destination);
    await this.saveTrashRecords(
      records.filter((item) => item.trashPath !== trashPath)
    );

    this.kernel.notify.info(
      "Trash",
      `Restored "${record.name}" to ${destination}.`
    );
  }

  private async removeTrashRecord(trashPath: string): Promise<void> {
    const records = await this.loadTrashRecords();
    await this.saveTrashRecords(
      records.filter((item) => item.trashPath !== trashPath)
    );
  }

  private async openFile(path: string | undefined): Promise<void> {
    if (!path) return;

    try {
      const text = await this.kernel.sys.read(path);
      const name = Path.basename(path);
      this.wm.open({
        id: "file-viewer-" + path.replace(/[^a-zA-Z0-9_-]/g, "-"),
        title: name,
        width: 700,
        height: 480,
        x: 120,
        y: 80,
        content: `
          <div class="file-viewer">
            <div class="file-viewer-path">${this.escapeHtml(path)}</div>
            <textarea class="file-viewer-editor" spellcheck="false">${this.escapeHtml(text)}</textarea>
            <div class="file-viewer-actions">
              <button type="button" data-save-file>Save</button>
            </div>
          </div>
        `
      });

      requestAnimationFrame(() => {
        const win = document.getElementById(
          "file-viewer-" + path.replace(/[^a-zA-Z0-9_-]/g, "-")
        );
        win?.querySelector<HTMLButtonElement>("[data-save-file]")?.addEventListener("click", async () => {
          const editor = win.querySelector<HTMLTextAreaElement>(".file-viewer-editor");
          if (!editor) return;
          try {
            await this.kernel.sys.write(path, editor.value);
            this.kernel.notify.info(name, "File saved.");
          } catch (error) {
            this.kernel.notify.info(name, this.describeError(error));
          }
        });
      });
    } catch (error) {
      this.kernel.notify.info("Explorer", this.describeError(error));
    }
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
