import type { VfsEntry } from "./VfsTypes";

type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
};

type DriveListResponse = {
  ok?: boolean;
  files?: DriveFile[];
  error?: string;
};

const FOLDER_MIME = "application/vnd.google-apps.folder";
const CLOUD_ROOT = "/home/user";
const DEFAULT_CLOUD_API_URL = "https://oqerun-os.vruntimelabs.workers.dev";

export class CloudVFS {
  private readonly apiBase =
    (
      import.meta.env.VITE_OQERUN_CLOUD_API_URL ||
      DEFAULT_CLOUD_API_URL
    ).trim();

  private readonly directoryIds = new Map<string, string>([
    [CLOUD_ROOT, "root"]
  ]);

  private connectionCache: {
    value: boolean;
    expiresAt: number;
  } = {
    value: false,
    expiresAt: 0
  };

  private apiUrl(path: string): string | null {
    if (!this.apiBase) return null;

    return new URL(
      path,
      this.apiBase.endsWith("/") ? this.apiBase : `${this.apiBase}/`
    ).toString();
  }

  handles(path: string): boolean {
    return path === CLOUD_ROOT || path.startsWith(`${CLOUD_ROOT}/`);
  }

  async isConnected(): Promise<boolean> {
    if (!this.apiBase) return false;

    if (Date.now() < this.connectionCache.expiresAt) {
      return this.connectionCache.value;
    }

    try {
      const url = this.apiUrl("/api/cloud/google/status");
      if (!url) return false;

      const response = await fetch(url, {
        credentials: "include",
        cache: "no-store"
      });

      if (!response.ok) {
        this.connectionCache = {
          value: false,
          expiresAt: Date.now() + 5000
        };
        return false;
      }

      const data = (await response.json()) as {
        connected?: boolean;
      };

      this.connectionCache = {
        value: data.connected === true,
        expiresAt: Date.now() + 15000
      };

      return this.connectionCache.value;
    } catch {
      this.connectionCache = {
        value: false,
        expiresAt: Date.now() + 5000
      };
      return false;
    }
  }

  async listDetailed(path: string): Promise<VfsEntry[]> {
    const parentId = await this.resolveDirectoryId(path);
    const response = await this.listByParent(parentId);

    return (response.files ?? [])
      .filter(file => !!file.name)
      .map(file => ({
        name: file.name as string,
        kind: file.mimeType === FOLDER_MIME
          ? "directory"
          : "file"
      }));
  }

  async list(path: string): Promise<string[]> {
    const entries = await this.listDetailed(path);
    return entries.map(entry => entry.name);
  }

  async exists(path: string): Promise<boolean> {
    if (path === CLOUD_ROOT) return true;

    try {
      await this.resolveDirectoryId(path);
      return true;
    } catch {
      // Continue and check for a file with this name.
    }

    try {
      const parentPath = this.dirname(path);
      const name = this.basename(path);
      const parentId = await this.resolveDirectoryId(parentPath);
      const response = await this.listByParent(parentId);

      return (response.files ?? []).some(
        file => file.name === name
      );
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    const file = await this.resolveFile(path);
    const url = this.apiUrl(
      `/api/cloud/google/content?fileId=${encodeURIComponent(file.id!)}`
    );

    if (!url) {
      throw new Error("Oqerun Cloud API is not configured.");
    }

    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      const message = await this.readError(response);
      throw new Error(message);
    }

    return response.text();
  }

  async writeFile(path: string, content: string): Promise<void> {
    const parentPath = this.dirname(path);
    const name = this.basename(path);
    const parentId = await this.resolveDirectoryId(parentPath);

    const existing = await this.findChild(parentId, name);
    const blob = new Blob([content], {
      type: this.mimeType(name)
    });

    await this.upload(
      name,
      parentId,
      blob,
      existing?.id
    );
  }

  async createDirectory(path: string): Promise<void> {
    const parentPath = this.dirname(path);
    const name = this.basename(path);
    const parentId = await this.resolveDirectoryId(parentPath);

    if (await this.findChild(parentId, name)) {
      return;
    }

    const url = this.apiUrl("/api/cloud/google/files");
    if (!url) {
      throw new Error("Oqerun Cloud API is not configured.");
    }

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        parentId,
        mimeType: FOLDER_MIME
      })
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }

    const data = (await response.json()) as {
      file?: { id?: string };
    };

    if (data.file?.id) {
      this.directoryIds.set(path, data.file.id);
    }
  }

  private async upload(
    name: string,
    parentId: string,
    blob: Blob,
    fileId?: string
  ): Promise<void> {
    if (blob.size > 4 * 1024 * 1024) {
      throw new Error(
        "Cloud uploads are currently limited to 4 MB. Larger-file resumable transfers are planned next."
      );
    }

    const url = this.apiUrl("/api/cloud/google/content");
    if (!url) {
      throw new Error("Oqerun Cloud API is not configured.");
    }

    const form = new FormData();
    form.append(
      "file",
      new File([blob], name, {
        type: blob.type || "application/octet-stream"
      })
    );
    form.append("name", name);
    form.append("parentId", parentId);

    if (fileId) {
      form.append("fileId", fileId);
    }

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: form
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }
  }

  private async resolveDirectoryId(path: string): Promise<string> {
    if (!this.handles(path)) {
      throw new Error("Cloud paths must live under /home/user.");
    }

    const normalized = this.normalize(path);
    const cached = this.directoryIds.get(normalized);

    if (cached) return cached;
    if (normalized === CLOUD_ROOT) return "root";

    const relativeParts = normalized
      .slice(CLOUD_ROOT.length)
      .split("/")
      .filter(Boolean);

    let currentPath = CLOUD_ROOT;
    let currentId = "root";

    for (const part of relativeParts) {
      const nextPath = `${currentPath}/${part}`;
      const cachedNext = this.directoryIds.get(nextPath);

      if (cachedNext) {
        currentPath = nextPath;
        currentId = cachedNext;
        continue;
      }

      const response = await this.listByParent(currentId);
      const folder = (response.files ?? []).find(
        file =>
          file.name === part &&
          file.mimeType === FOLDER_MIME
      );

      if (!folder?.id) {
        throw new Error(`Cloud folder not found: ${nextPath}`);
      }

      currentPath = nextPath;
      currentId = folder.id;
      this.directoryIds.set(nextPath, currentId);
    }

    return currentId;
  }

  private async resolveFile(path: string): Promise<DriveFile> {
    const parentId = await this.resolveDirectoryId(
      this.dirname(path)
    );
    const file = await this.findChild(
      parentId,
      this.basename(path)
    );

    if (!file?.id || file.mimeType === FOLDER_MIME) {
      throw new Error(`Cloud file not found: ${path}`);
    }

    return file;
  }

  private async findChild(
    parentId: string,
    name: string
  ): Promise<DriveFile | null> {
    const response = await this.listByParent(parentId);
    return (
      (response.files ?? []).find(
        file => file.name === name
      ) ?? null
    );
  }

  private async listByParent(
    parentId: string
  ): Promise<DriveListResponse> {
    const url = this.apiUrl(
      `/api/cloud/google/files?parentId=${encodeURIComponent(parentId)}`
    );

    if (!url) {
      throw new Error("Oqerun Cloud API is not configured.");
    }

    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }

    return (await response.json()) as DriveListResponse;
  }

  private async readError(response: Response): Promise<string> {
    try {
      const data = (await response.json()) as {
        error?: string;
      };
      return data.error ?? "Oqerun Cloud request failed.";
    } catch {
      return "Oqerun Cloud request failed.";
    }
  }

  private normalize(path: string): string {
    const parts = path
      .split("/")
      .filter(Boolean);

    return "/" + parts.join("/");
  }

  private dirname(path: string): string {
    const normalized = this.normalize(path);
    if (normalized === CLOUD_ROOT) return CLOUD_ROOT;

    const parts = normalized.split("/");
    parts.pop();

    const result = parts.join("/");
    return result || "/";
  }

  private basename(path: string): string {
    const normalized = this.normalize(path);
    return normalized.split("/").pop() || "/";
  }

  private mimeType(name: string): string {
    const extension = name
      .split(".")
      .pop()
      ?.toLowerCase();

    const types: Record<string, string> = {
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      html: "text/html",
      css: "text/css",
      js: "text/javascript",
      ts: "text/plain",
      svg: "image/svg+xml"
    };

    return types[extension ?? ""] ?? "text/plain";
  }
}
