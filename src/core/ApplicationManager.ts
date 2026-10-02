import type { VfsEntry } from "../vfs/VfsTypes";

export type InstalledAppType = "oqpkg" | "pwa" | "web" | "wasm" | "external";

export interface InstalledApplication {
  id: string;
  name: string;
  version: string;
  type: InstalledAppType;
  sourceUrl?: string;
  iconUrl?: string;
  permissions: string[];
  fileAssociations: string[];
  installedAt: string;
  updatedAt: string;
}

const REGISTRY_PATH = "/system/applications.json";

export class ApplicationManager {
  private initialized = false;
  private apps = new Map<string, InstalledApplication>();

  constructor(private readonly sys: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    listDetailed(path: string): Promise<VfsEntry[]>;
  }) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (await this.sys.exists(REGISTRY_PATH)) {
        const raw = await this.sys.read(REGISTRY_PATH);
        const parsed = JSON.parse(raw) as InstalledApplication[];
        if (Array.isArray(parsed)) {
          for (const app of parsed) {
            if (app?.id && app?.name) {
              this.apps.set(app.id, app);
            }
          }
        }
      }
    } catch {
      this.apps.clear();
    }

    this.initialized = true;
  }

  async install(input: Omit<InstalledApplication, "installedAt" | "updatedAt">): Promise<InstalledApplication> {
    await this.initialize();

    const now = new Date().toISOString();
    const existing = this.apps.get(input.id);

    const app: InstalledApplication = {
      ...input,
      installedAt: existing?.installedAt ?? now,
      updatedAt: now
    };

    const appPath = "/apps/" + this.safeId(app.id);
    await this.sys.mkdir("/apps");
    await this.sys.mkdir(appPath);
    await this.sys.write(
      appPath + "/manifest.json",
      JSON.stringify(app, null, 2)
    );

    this.apps.set(app.id, app);
    await this.persist();

    return app;
  }

  async uninstall(id: string): Promise<void> {
    await this.initialize();
    this.apps.delete(id);

    const appPath = "/apps/" + this.safeId(id);
    try {
      if (await this.sys.exists(appPath)) {
        const remove = (this.sys as typeof this.sys & {
          remove?: (path: string) => Promise<void>;
        }).remove;
        if (remove) await remove(appPath);
      }
    } catch {
      // Registry removal remains valid even if package cleanup is unavailable.
    }

    await this.persist();
  }

  async list(): Promise<InstalledApplication[]> {
    await this.initialize();
    return [...this.apps.values()];
  }

  get(id: string): InstalledApplication | undefined {
    return this.apps.get(id);
  }

  private async persist(): Promise<void> {
    await this.sys.mkdir("/system");
    await this.sys.write(
      REGISTRY_PATH,
      JSON.stringify([...this.apps.values()], null, 2)
    );
  }

  private safeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9._-]/g, "-");
  }
}
