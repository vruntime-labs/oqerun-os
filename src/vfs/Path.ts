export class Path {
  static normalize(path: string): string {
    if (!path.startsWith("/")) path = "/" + path;

    const parts = path
      .split("/")
      .filter(Boolean);

    const stack: string[] = [];

    for (const part of parts) {
      if (part === ".") continue;

      if (part === "..") {
        stack.pop();
        continue;
      }

      stack.push(part);
    }

    return "/" + stack.join("/");
  }

  static join(...parts: string[]): string {
    return Path.normalize(parts.join("/"));
  }

  static dirname(path: string): string {
    const normalized = Path.normalize(path);

    if (normalized === "/") return "/";

    const parts = normalized.split("/");
    parts.pop();

    return parts.length === 1 ? "/" : parts.join("/");
  }

  static basename(path: string): string {
    const normalized = Path.normalize(path);

    if (normalized === "/") return "/";

    return normalized.split("/").pop() || "/";
  }

  static extname(path: string): string {
    const base = Path.basename(path);
    const index = base.lastIndexOf(".");

    return index > 0 ? base.slice(index) : "";
  }

  static isAbsolute(path: string): boolean {
    return path.startsWith("/");
  }

  static split(path: string): string[] {
    return Path.normalize(path)
      .split("/")
      .filter(Boolean);
  }
}
