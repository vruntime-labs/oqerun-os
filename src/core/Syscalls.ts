import { VFS, VfsEntry } from "../vfs/VFS";

export class Syscalls {
  private vfs =
    new VFS();

  private initialized =
    false;

  private async ensureReady(): Promise<void> {
    if (!this.initialized) {
      await this.vfs.initialize();
      this.initialized = true;
    }
  }

  async read(
    path: string
  ): Promise<string> {
    await this.ensureReady();
    return this.vfs.read(path);
  }

  async write(
    path: string,
    content: string
  ): Promise<void> {
    await this.ensureReady();
    await this.vfs.write(
      path,
      content
    );
  }

  async mkdir(
    path: string
  ): Promise<void> {
    await this.ensureReady();
    await this.vfs.mkdir(path);
  }

  async list(
    path: string
  ): Promise<string[]> {
    await this.ensureReady();
    return this.vfs.list(path);
  }

  async listDetailed(
    path: string
  ): Promise<VfsEntry[]> {
    await this.ensureReady();
    return this.vfs.listDetailed(
      path
    );
  }

  async exists(
    path: string
  ): Promise<boolean> {
    await this.ensureReady();
    return this.vfs.exists(path);
  }
}
