import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class Terminal {
  private currentPath = "/home/user";

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  open(): void {
    const windowId = "terminal";

    this.wm.open({
      id: windowId,
      title: "Terminal",
      width: 680,
      height: 420,
      x: 150,
      y: 90,
      content: `
        <div class="terminal">
          <div id="terminal-output" class="terminal-output">
            <div>Oqerun Terminal v0.2</div>
            <div>Type <b>help</b> to begin.</div>
          </div>

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
    const path = win.querySelector("#terminal-path") as HTMLSpanElement;

    input.focus();

    input.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;

      const command = input.value.trim();
      output.innerHTML += `<div><span>${this.currentPath}$</span> ${command}</div>`;

      await this.run(command, output, path);

      input.value = "";
      output.scrollTop = output.scrollHeight;
    });
  }

  private async run(
    command: string,
    output: HTMLDivElement,
    pathLabel: HTMLElement
  ): Promise<void> {
    const [cmd, ...args] = command.split(" ");

    switch (cmd) {
      case "help":
        output.innerHTML += `
          <div>Commands:</div>
          <div>pwd</div>
          <div>ls</div>
          <div>cd &lt;folder&gt;</div>
          <div>mkdir &lt;folder&gt;</div>
          <div>touch &lt;file&gt;</div>
          <div>cat &lt;file&gt;</div>
        `;
        break;

      case "pwd":
        output.innerHTML += `<div>${this.currentPath}</div>`;
        break;

      case "ls":
        try {
          const files = await this.kernel.sys.list(this.currentPath);
          output.innerHTML += `<div>${files.join("  ") || "(empty)"}</div>`;
        } catch {
          output.innerHTML += `<div>Unable to read directory.</div>`;
        }
        break;

      case "cd":
        if (!args[0]) break;

        if (args[0] === "..") {
          const parts = this.currentPath.split("/").filter(Boolean);
          parts.pop();
          this.currentPath = "/" + parts.join("/");
          if (this.currentPath === "") this.currentPath = "/";
        } else {
          this.currentPath = `${this.currentPath}/${args[0]}`.replace(/\/+/g, "/");
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
          const text = await this.kernel.sys.read(`${this.currentPath}/${args[0]}`);
          output.innerHTML += `<div>${text || "(empty file)"}</div>`;
        } catch {
          output.innerHTML += `<div>File not found.</div>`;
        }
        break;

      case "":
        break;

      default:
        output.innerHTML += `<div>Unknown command: ${cmd}</div>`;
    }
  }
}
