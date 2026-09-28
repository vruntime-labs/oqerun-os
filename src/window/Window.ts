export interface WindowOptions {
  id: string;
  title: string;
  content: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export class OqWindow {
  constructor(private options: WindowOptions) {}

  render(): HTMLDivElement {
    const win = document.createElement("div");
    win.className = "oq-window";
    win.id = this.options.id;

    win.style.width = `${this.options.width ?? 520}px`;
    win.style.height = `${this.options.height ?? 340}px`;
    win.style.left = `${this.options.x ?? 120}px`;
    win.style.top = `${this.options.y ?? 80}px`;

    win.innerHTML = `
      <div class="window-titlebar">
        <span>${this.options.title}</span>

        <div class="window-controls">
          <button class="win-close">✕</button>
        </div>
      </div>

      <div class="window-content">
        ${this.options.content}
      </div>
    `;

    win.querySelector(".win-close")?.addEventListener("click", () => {
      win.remove();
    });

    return win;
  }
}
