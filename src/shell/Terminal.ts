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
          <div id="terminal-output" class="terminal-output">
            <div>Oqerun Terminal v0.3</div>
            <div>Type <b>help</b> to begin.</div>
          </div>

          <div class="terminal-input-row">
            <span id="terminal-path">${this.currentPath}</span>
            <input id="terminal-input" type="text" autocomplete="off">
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

      if (e.key !== "Enter") return;

      const command = input.value.trim();

      output.innerHTML += `<div><span>${this.currentPath}$</span> ${command}</div>`;

      if (command) {
        this.history.push(command);
        this.historyIndex = this.history.length;
      }

      await this.run(command, output, pathLabel);

      input.value = "";
      output.scrollTop = output.scrollHeight;
    });
  }

  private async run(
    command: string,
    output: HTMLDivElement,
    pathLabel: HTMLElement
  ) {
    const [cmd, ...args] = command.split(" ");

    switch (cmd) {
      case "":
        return;

      case "help":
        output.innerHTML += `
          <div>Commands</div>
          <div>pwd ls cd mkdir touch cat</div>
          <div>clear echo history rm mv cp open</div>
        `;
        break;

      case "clear":
        output.innerHTML = "";
        break;

      case "pwd":
        output.innerHTML += `<div>${this.currentPath}</div>`;
        break;

      case "history":
        this.history.forEach((c, i) => {
          output.innerHTML += `<div>${i + 1}  ${c}</div>`;
        });
        break;

      case "echo":
        output.innerHTML += `<div>${args.join(" ")}</div>`;
        break;

      case "ls":
        try {
          const items = await this.kernel.sys.list(this.currentPath);
          output.innerHTML += `<div>${items.join("   ") || "(empty)"}</div>`;
        } catch {
          output.innerHTML += `<div>Cannot read directory.</div>`;
        }
        break;

      case "cd":
        if (!args[0]) break;

        if (args[0] === "..") {
          const parts = this.currentPath.split("/").filter(Boolean);
          parts.pop();
          this.currentPath = "/" + parts.join("/");
          if (!this.currentPath || this.currentPath === "") this.currentPath = "/";
        } else {
          this.currentPath =
            `${this.currentPath}/${args[0]}`.replace(/\/+/g, "/");
        }

        pathLabel.textContent = this.currentPath;
        break;

      case "mkdir":
        if (!args[0]) break;
        await this.kernel.sys.mkdir(`${this.currentPath}/${args[0]}`);
        output.innerHTML += `<div>Directory created.</div>`;
        break;

      case "touch":
        if (!args[0]) break;
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

      case "rm":
        output.innerHTML += `<div>Delete support is coming next.</div>`;
        break;

      case "mv":
        output.innerHTML += `<div>Move support is coming next.</div>`;
        break;

      case "cp":
        output.innerHTML += `<div>Copy support is coming next.</div>`;
        break;

      case "open":
        new Explorer(this.kernel, this.wm).open(this.currentPath);
        break;

      default:
        output.innerHTML += `<div>Unknown command: ${cmd}</div>`;
    }
  }
}
