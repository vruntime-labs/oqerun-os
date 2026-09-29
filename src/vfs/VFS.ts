import { OPFS } from "./OPFS";
import type { VfsEntry } from "./VfsTypes";
import { Path } from "./Path";

export { VfsEntry };

export class VFS {
  private storage =
    new OPFS();

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
      await this.storage.createDirectory(
        folder
      );
    }
  }

  async write(
    path: string,
    content: string
  ): Promise<void> {
    await this.storage.writeFile(
      Path.normalize(path),
      content
    );
  }

  async read(
    path: string
  ): Promise<string> {
    return this.storage.readFile(
      Path.normalize(path)
    );
  }

  async exists(
    path: string
  ): Promise<boolean> {
    return this.storage.exists(
      Path.normalize(path)
    );
  }

  async mkdir(
    path: string
  ): Promise<void> {
    await this.storage.createDirectory(
      Path.normalize(path)
    );
  }

  async list(
    path: string
  ): Promise<string[]> {
    return this.storage.list(
      Path.normalize(path)
    );
  }

  async listDetailed(
    path: string
  ): Promise<VfsEntry[]> {
    return this.storage.listDetailed(
      Path.normalize(path)
    );
  }
}
