import { Drag } from "./Drag";

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
  private element: HTMLDivElement;

  constructor(private options: WindowOptions) {
    this.element = document.createElement("div");
    this.element.className = "oq-window";
    this.element.id = options.id;

    this.element.style.width = `${options.width ?? 520}px`;
    this.element.style.height = `${options.height ?? 340}px`;
    this.element.style.left = `${options.x ?? 120}px`;
    this.element.style.top = `${options.y ?? 80}px`;
    this.element.style.position = "absolute";

    this.element.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title">${options.title}</span>

        <div class="window-controls">
          <button class="win-close" aria-label="Close">✕</button>
        </div>
      </div>

      <div class="window-content">
        ${options.content}
      </div>
    `;

    this.element
      .querySelector(".win-close")
      ?.addEventListener("click", () => {
        this.element.dispatchEvent(
          new CustomEvent("window:close", {
            bubbles: true,
            detail: { id: this.options.id }
          })
        );
      });

    Drag.enable(this.element);
  }

  render(): HTMLDivElement {
    return this.element;
  }

  close(): void {
    this.element.remove();
  }

  focus(zIndex: number): void {
    this.element.style.zIndex = String(zIndex);
  }
}
