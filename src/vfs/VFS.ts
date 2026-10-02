import { CloudVFS } from "./CloudVFS";
import { OPFS } from "./OPFS";
import type { VfsEntry } from "./VfsTypes";
import { Path } from "./Path";

export { VfsEntry };

export class VFS {
  private readonly storage = new OPFS();
  private readonly cloud = new CloudVFS();

  async initialize(): Promise<void> {
    const folders = [
      "/home",
      "/home/user",
      "/home/user/Desktop",
      "/home/user/Documents",
      "/home/user/Downloads",
      "/home/user/Pictures",
      "/apps",
      "/system",
      "/temp",
      "/mnt",
      "/mnt/computer",
      "/mnt/cloud"
    ];

    for (const folder of folders) {
      await this.storage.createDirectory(folder);
    }
  }

  async write(
    path: string,
    content: string
  ): Promise<void> {
    const normalized = Path.normalize(path);

    if (this.cloud.handles(normalized)) {
      await this.cloud.writeFile(
        normalized,
        content
      );
      return;
    }

    await this.storage.writeFile(
      normalized,
      content
    );
  }

  async read(
    path: string
  ): Promise<string> {
    const normalized = Path.normalize(path);

    if (this.cloud.handles(normalized)) {
      return this.cloud.readFile(
        normalized
      );
    }

    return this.storage.readFile(
      normalized
    );
  }

  async exists(
    path: string
  ): Promise<boolean> {
    const normalized = Path.normalize(path);

    if (this.cloud.handles(normalized)) {
      return this.cloud.exists(
        normalized
      );
    }

    return this.storage.exists(
      normalized
    );
  }

  async mkdir(
    path: string
  ): Promise<void> {
    const normalized = Path.normalize(path);

    if (this.cloud.handles(normalized)) {
      await this.cloud.createDirectory(
        normalized
      );
      return;
    }

    await this.storage.createDirectory(
      normalized
    );
  }

  async list(
    path: string
  ): Promise<string[]> {
    const normalized = Path.normalize(path);

    if (this.cloud.handles(normalized)) {
      return this.cloud.list(
        normalized
      );
    }

    return this.storage.list(
      normalized
    );
  }

  async remove(path: string): Promise<void> {
    const normalized = Path.normalize(path);

    if (this.cloud.handles(normalized)) {
      throw new Error("Cloud delete is not enabled yet.");
    }

    await this.storage.remove(normalized);
  }

  async rename(path: string, newPath: string): Promise<void> {
    const normalized = Path.normalize(path);
    const destination = Path.normalize(newPath);

    if (this.cloud.handles(normalized) || this.cloud.handles(destination)) {
      throw new Error("Cloud rename is not enabled yet.");
    }

    await this.storage.rename(normalized, destination);
  }

  async listDetailed(
    path: string
  ): Promise<VfsEntry[]> {
    const normalized = Path.normalize(path);

    if (this.cloud.handles(normalized)) {
      return this.cloud.listDetailed(
        normalized
      );
    }

    return this.storage.listDetailed(
      normalized
    );
  }
}
