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
          <div>open</div>
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
        new Explorer(this.kernel, this.wm).open(this.currentPath);
        break;

      case "rm":
      case "mv":
      case "cp":
        output.innerHTML += `<div>${cmd}: coming in the next filesystem update.</div>`;
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
      "open"
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
