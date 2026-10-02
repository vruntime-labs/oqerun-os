import { Path } from "./Path";
import type { VfsEntry } from "./VfsTypes";

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

  async remove(path: string): Promise<void> {
    const normalized = Path.normalize(path);
    const parent = await this.getDirectory(Path.dirname(normalized));
    await parent.removeEntry(Path.basename(normalized), { recursive: true });
  }

  async rename(path: string, newPath: string): Promise<void> {
    const source = Path.normalize(path);
    const destination = Path.normalize(newPath);

    if (source === destination) return;

    const sourceParent = await this.getDirectory(Path.dirname(source));
    const destinationParent = await this.getDirectory(Path.dirname(destination));
    const sourceName = Path.basename(source);
    const destinationName = Path.basename(destination);

    let sourceFile: FileSystemFileHandle | null = null;

    try {
      sourceFile = await sourceParent.getFileHandle(sourceName);
    } catch {
      sourceFile = null;
    }

    if (sourceFile) {
      const target = await destinationParent.getFileHandle(destinationName, { create: true });
      const writable = await target.createWritable();
      await writable.write(await sourceFile.getFile());
      await writable.close();
      await sourceParent.removeEntry(sourceName);
      return;
    }

    const sourceDir = await sourceParent.getDirectoryHandle(sourceName);
    const destinationDir = await destinationParent.getDirectoryHandle(destinationName, { create: true });

    const copyDirectory = async (
      from: FileSystemDirectoryHandle,
      to: FileSystemDirectoryHandle
    ): Promise<void> => {
      for await (const [name, handle] of from.entries()) {
        if (handle.kind === "file") {
          const sourceHandle = await from.getFileHandle(name);
          const targetHandle = await to.getFileHandle(name, { create: true });
          const writable = await targetHandle.createWritable();
          await writable.write(await sourceHandle.getFile());
          await writable.close();
        } else {
          const child = await to.getDirectoryHandle(name, { create: true });
          await copyDirectory(handle as FileSystemDirectoryHandle, child);
        }
      }
    };

    await copyDirectory(sourceDir, destinationDir);
    await sourceParent.removeEntry(sourceName, { recursive: true });
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
