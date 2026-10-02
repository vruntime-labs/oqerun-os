import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { Explorer } from "./Explorer";

export class Terminal {
  private currentPath = "/home/user";
  private history: string[] = [];
  private historyIndex = 0;

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  open(): void {
    const windowId = "terminal";

    this.wm.open({
      id: windowId,
      title: "Terminal",
      width: 700,
      height: 440,
      x: 150,
      y: 90,
      content: `
        <div class="terminal">
          <div id="terminal-output" class="terminal-output"></div>

          <div class="terminal-input-row">
            <span id="terminal-path">${this.currentPath}</span>
            <input id="terminal-input" type="text" autocomplete="off" spellcheck="false">
          </div>
        </div>
      `
    });

    requestAnimationFrame(() => this.attach(windowId));
  }

  private attach(windowId: string): void {
    const win = document.getElementById(windowId);
    if (!win) return;

    const output = win.querySelector("#terminal-output") as HTMLDivElement;
    const input = win.querySelector("#terminal-input") as HTMLInputElement;
    const pathLabel = win.querySelector("#terminal-path") as HTMLElement;

    this.printBanner(output);
    input.focus();

    input.addEventListener("keydown", async (e) => {

      if (e.key === "ArrowUp") {
        e.preventDefault();

        if (this.history.length) {
          this.historyIndex = Math.max(0, this.historyIndex - 1);
          input.value = this.history[this.historyIndex];
        }

        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();

        if (this.history.length) {
          this.historyIndex = Math.min(
            this.history.length,
            this.historyIndex + 1
          );

          input.value =
            this.historyIndex === this.history.length
              ? ""
              : this.history[this.historyIndex];
        }

        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        await this.autocomplete(input);
        return;
      }

      if (e.key !== "Enter") return;

      const command = input.value.trim();

      output.innerHTML += `
        <div class="terminal-line">
          <span class="terminal-prompt">${this.currentPath}$</span> ${command}
        </div>
      `;

      if (command) {
        this.history.push(command);
        this.historyIndex = this.history.length;
      }

      await this.execute(command, output, pathLabel);

      input.value = "";
      output.scrollTop = output.scrollHeight;
    });
  }

  private printBanner(output: HTMLDivElement): void {
    output.innerHTML = `
      <div>Oqerun Terminal v0.3</div>
      <div>Type <b>help</b> to begin.</div>
      <div></div>
    `;
  }

  private async execute(
    command: string,
    output: HTMLDivElement,
    pathLabel: HTMLElement
  ): Promise<void> {

    if (!command) return;

    const commands = command
      .split("&&")
      .map(c => c.trim())
      .filter(Boolean);

    for (const cmd of commands) {
      await this.runSingle(cmd, output, pathLabel);
    }
  }

  private async runSingle(
    command: string,
    output: HTMLDivElement,
    pathLabel: HTMLElement
  ) {

    const [cmd, ...args] = command.split(/\s+/);

    switch (cmd) {

      case "help":
        output.innerHTML += `
          <div>Available commands</div>
          <div>pwd</div>
          <div>ls</div>
          <div>cd &lt;folder&gt;</div>
          <div>mkdir &lt;folder&gt;</div>
          <div>touch &lt;file&gt;</div>
          <div>cat &lt;file&gt;</div>
          <div>echo &lt;text&gt;</div>
          <div>history</div>
          <div>clear</div>
          <div>open [path]</div>
          <div>rm &lt;path&gt;</div>
          <div>mv &lt;source&gt; &lt;destination&gt;</div>
          <div>cp &lt;source&gt; &lt;destination&gt;</div>
          <div>apps</div>
          <div>app &lt;id&gt;</div>
          <div>cloud</div>
          <div>mount</div>
          <div></div>
        `;
        break;

      case "clear":
        this.printBanner(output);
        break;

      case "pwd":
        output.innerHTML += `<div>${this.currentPath}</div>`;
        break;

      case "echo":
        output.innerHTML += `<div>${args.join(" ")}</div>`;
        break;

      case "history":
        this.history.forEach((c, i) => {
          output.innerHTML += `<div>${i + 1}. ${c}</div>`;
        });
        break;

      case "ls":
        try {
          const items = await this.kernel.sys.list(this.currentPath);
          output.innerHTML += `<div>${items.join("   ") || "(empty)"}</div>`;
        } catch {
          output.innerHTML += `<div>Unable to read directory.</div>`;
        }
        break;

      case "cd":
        await this.changeDirectory(args[0], output, pathLabel);
        break;

      case "mkdir":
        if (!args[0]) {
          output.innerHTML += `<div>Usage: mkdir &lt;folder&gt;</div>`;
          break;
        }

        await this.kernel.sys.mkdir(`${this.currentPath}/${args[0]}`);
        output.innerHTML += `<div>Directory created.</div>`;
        break;

      case "touch":
        if (!args[0]) {
          output.innerHTML += `<div>Usage: touch &lt;file&gt;</div>`;
          break;
        }

        await this.kernel.sys.write(`${this.currentPath}/${args[0]}`, "");
        output.innerHTML += `<div>File created.</div>`;
        break;

      case "cat":
        if (!args[0]) break;

        try {
          const text = await this.kernel.sys.read(
            `${this.currentPath}/${args[0]}`
          );

          output.innerHTML += `<div>${text || "(empty file)"}</div>`;
        } catch {
          output.innerHTML += `<div>File not found.</div>`;
        }
        break;

      case "open":
        await new Explorer(this.kernel, this.wm).open(args[0] || this.currentPath);
        break;

      case "rm":
        if (!args[0]) {
          output.innerHTML += "<div>Usage: rm &lt;path&gt;</div>";
          break;
        }
        try {
          await this.kernel.sys.remove(this.resolvePath(args[0]));
          output.innerHTML += "<div>Removed.</div>";
        } catch (error) {
          output.innerHTML += `<div>${this.escape(this.describeError(error))}</div>`;
        }
        break;

      case "mv":
        if (!args[0] || !args[1]) {
          output.innerHTML += "<div>Usage: mv &lt;source&gt; &lt;destination&gt;</div>";
          break;
        }
        try {
          await this.kernel.sys.rename(
            this.resolvePath(args[0]),
            this.resolvePath(args[1])
          );
          output.innerHTML += "<div>Moved.</div>";
        } catch (error) {
          output.innerHTML += `<div>${this.escape(this.describeError(error))}</div>`;
        }
        break;

      case "cp":
        if (!args[0] || !args[1]) {
          output.innerHTML += "<div>Usage: cp &lt;source&gt; &lt;destination&gt;</div>";
          break;
        }
        try {
          const source = this.resolvePath(args[0]);
          const destination = this.resolvePath(args[1]);
          const data = await this.kernel.sys.read(source);
          await this.kernel.sys.write(destination, data);
          output.innerHTML += "<div>Copied.</div>";
        } catch (error) {
          output.innerHTML += `<div>${this.escape(this.describeError(error))}</div>`;
        }
        break;

      case "apps": {
        const apps = await this.kernel.applications.list();
        output.innerHTML += apps.length
          ? apps.map((app) => `<div>${this.escape(app.id)} — ${this.escape(app.name)}</div>`).join("")
          : "<div>No installed Store applications.</div>";
        break;
      }

      case "app": {
        const app = args[0] ? this.kernel.applications.get(args[0]) : undefined;
        if (!app) {
          output.innerHTML += "<div>Application not found.</div>";
          break;
        }
        this.kernel.notify.info(app.name, "Opening application.");
        if (app.sourceUrl) {
          this.wm.open({
            id: "installed-app-" + app.id.replace(/[^a-zA-Z0-9_-]/g, "-"),
            title: app.name,
            iconUrl: app.iconUrl,
            width: 980,
            height: 640,
            content: `<iframe class="installed-app-frame" src="${this.escapeAttribute(app.sourceUrl)}" title="${this.escapeAttribute(app.name)}"></iframe>`
          });
        }
        break;
      }

      case "cloud":
        output.innerHTML += "<div>/mnt/cloud/google-drive is available when Google Drive is connected.</div>";
        break;

      case "mount":
        output.innerHTML += "<div>Mount points: /mnt/computer, /mnt/cloud</div>";
        break;

      default:
        output.innerHTML += `<div>Unknown command: ${cmd}</div>`;
    }
  }

  private async changeDirectory(
    target: string | undefined,
    output: HTMLDivElement,
    pathLabel: HTMLElement
  ) {

    if (!target) return;

    if (target === "..") {
      const parts = this.currentPath.split("/").filter(Boolean);
      parts.pop();
      this.currentPath = parts.length ? "/" + parts.join("/") : "/";
      pathLabel.textContent = this.currentPath;
      return;
    }

    const next =
      target.startsWith("/")
        ? target
        : `${this.currentPath}/${target}`.replace(/\/+/g, "/");

    try {
      await this.kernel.sys.list(next);
      this.currentPath = next;
      pathLabel.textContent = this.currentPath;
    } catch {
      output.innerHTML += `<div>No such directory: ${target}</div>`;
    }
  }

  private resolvePath(value: string): string {
    if (value.startsWith("/")) return value.replace(/\/+/g, "/");
    if (value === "~") return "/home/user";
    if (value.startsWith("~/")) return "/home/user/" + value.slice(2);
    return `${this.currentPath}/${value}`.replace(/\/+/g, "/");
  }

  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  private escapeAttribute(value: string): string {
    return this.escape(value).replaceAll("\"", "&quot;");
  }

  private describeError(error: unknown): string {
    return error instanceof Error ? error.message : "Command failed.";
  }

  private async autocomplete(input: HTMLInputElement): Promise<void> {

    const value = input.value.trim();

    const commands = [
      "help",
      "pwd",
      "ls",
      "cd",
      "mkdir",
      "touch",
      "cat",
      "echo",
      "history",
      "clear",
      "open",
      "rm",
      "mv",
      "cp",
      "apps",
      "app",
      "cloud",
      "mount"
    ];

    if (!value.includes(" ")) {
      const match = commands.find(c => c.startsWith(value));
      if (match) input.value = match;
      return;
    }

    const [cmd, partial] = value.split(/\s+/, 2);

    if (cmd === "cd" || cmd === "cat") {
      try {
        const items = await this.kernel.sys.list(this.currentPath);
        const match = items.find(i => i.startsWith(partial || ""));
        if (match) input.value = `${cmd} ${match}`;
      } catch {}
    }
  }
}
