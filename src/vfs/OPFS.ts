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
    const sourceParent = await this.getDirectory(Path.dirname(source));
    const destinationParent = await this.getDirectory(Path.dirname(destination));
    const sourceName = Path.basename(source);
    const destinationName = Path.basename(destination);

    try {
      const file = await sourceParent.getFileHandle(sourceName);
      const text = await (await file.getFile()).text();
      const target = await destinationParent.getFileHandle(destinationName, { create: true });
      const writable = await target.createWritable();
      await writable.write(text);
      await writable.close();
      await sourceParent.removeEntry(sourceName);
      return;
    } catch {
      // Fall through to directory copy/rename support.
    }

    const sourceDir = await sourceParent.getDirectoryHandle(sourceName);
    const destinationDir = await destinationParent.getDirectoryHandle(destinationName, { create: true });
    for await (const [name, handle] of sourceDir.entries()) {
      if (handle.kind === "file") {
        const file = await sourceDir.getFileHandle(name);
        const text = await (await file.getFile()).text();
        const target = await destinationDir.getFileHandle(name, { create: true });
        const writable = await target.createWritable();
        await writable.write(text);
        await writable.close();
      }
    }
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
