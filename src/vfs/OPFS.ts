import { Path } from "./Path";

export type VfsEntry = {
  name: string;
  kind: "file" | "directory";
};

export class OPFS {
  private rootPromise =
    navigator.storage.getDirectory();

  private async getDirectory(
    path: string
  ): Promise<FileSystemDirectoryHandle> {
    const parts = Path.split(path);
    let dir =
      await this.rootPromise;

    for (const part of parts) {
      dir =
        await dir.getDirectoryHandle(
          part,
          { create: true }
        );
    }

    return dir;
  }

  async writeFile(
    path: string,
    content: string
  ): Promise<void> {
    const directory =
      await this.getDirectory(
        Path.dirname(path)
      );

    const fileHandle =
      await directory.getFileHandle(
        Path.basename(path),
        { create: true }
      );

    const writable =
      await fileHandle.createWritable();

    await writable.write(content);
    await writable.close();
  }

  async readFile(
    path: string
  ): Promise<string> {
    const directory =
      await this.getDirectory(
        Path.dirname(path)
      );

    const fileHandle =
      await directory.getFileHandle(
        Path.basename(path)
      );

    const file =
      await fileHandle.getFile();

    return file.text();
  }

  async exists(
    path: string
  ): Promise<boolean> {
    try {
      const directory =
        await this.getDirectory(
          Path.dirname(path)
        );

      await directory.getFileHandle(
        Path.basename(path)
      );

      return true;
    } catch {
      try {
        const directory =
          await this.getDirectory(
            Path.dirname(path)
          );

        await directory.getDirectoryHandle(
          Path.basename(path)
        );

        return true;
      } catch {
        return false;
      }
    }
  }

  async createDirectory(
    path: string
  ): Promise<void> {
    await this.getDirectory(path);
  }

  async list(
    path: string
  ): Promise<string[]> {
    const entries =
      await this.listDetailed(path);

    return entries.map(
      entry => entry.name
    );
  }

  async listDetailed(
    path: string
  ): Promise<VfsEntry[]> {
    const directory =
      await this.getDirectory(path);

    const items: VfsEntry[] = [];

    for await (
      const [, handle]
      of directory.entries()
    ) {
      items.push({
        name: handle.name,
        kind: handle.kind
      });
    }

    return items;
  }
}
