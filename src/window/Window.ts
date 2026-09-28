export interface WindowConfig {
  id: string;
  title: string;
  content: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;

  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onFocus?: () => void;
}

export class Window {
  private element!: HTMLDivElement;
  private titlebar!: HTMLDivElement;

  private isDragging = false;
  private dragX = 0;
  private dragY = 0;

  private isMaximized = false;

  private previous = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };

  constructor(private config: WindowConfig) {}

  render(): void {
    const desktop =
      document.querySelector(".desktop-area") ||
      document.getElementById("desktop");

    if (!desktop) return;

    this.element = document.createElement("div");
    this.element.id = this.config.id;
    this.element.className = "oq-window";

    this.element.style.width = `${this.config.width ?? 520}px`;
    this.element.style.height = `${this.config.height ?? 380}px`;
    this.element.style.left = `${this.config.x ?? 120}px`;
    this.element.style.top = `${this.config.y ?? 80}px`;

    this.element.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title">${this.config.title}</span>

        <div class="window-controls">
          <button class="win-min" title="Minimize">—</button>
          <button class="win-max" title="Maximize">□</button>
          <button class="win-close" title="Close">✕</button>
        </div>
      </div>

      <div class="window-content">
        ${this.config.content}
      </div>
    `;

    desktop.appendChild(this.element);

    this.titlebar = this.element.querySelector(".window-titlebar")!;

    this.attachEvents();
  }

  private attachEvents(): void {
    this.element.addEventListener("mousedown", () => {
      this.config.onFocus?.();
    });

    this.titlebar.addEventListener("mousedown", (e) => {
      if (this.isMaximized) return;

      this.isDragging = true;

      const rect = this.element.getBoundingClientRect();

      this.dragX = e.clientX - rect.left;
      this.dragY = e.clientY - rect.top;

      document.addEventListener("mousemove", this.onDrag);
      document.addEventListener("mouseup", this.stopDrag);
    });

    this.element
      .querySelector(".win-close")
      ?.addEventListener("click", () => {
        this.config.onClose?.();
      });

    this.element
      .querySelector(".win-min")
      ?.addEventListener("click", () => {
        this.config.onMinimize?.();
      });

    this.element
      .querySelector(".win-max")
      ?.addEventListener("click", () => {
        this.config.onMaximize?.();
      });

    this.titlebar.addEventListener("dblclick", () => {
      this.config.onMaximize?.();
    });
  }

  private onDrag = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    this.element.style.left = `${e.clientX - this.dragX}px`;
    this.element.style.top = `${e.clientY - this.dragY}px`;
  };

  private stopDrag = (): void => {
    this.isDragging = false;

    document.removeEventListener("mousemove", this.onDrag);
    document.removeEventListener("mouseup", this.stopDrag);
  };

  hide(): void {
    this.element.style.display = "none";
  }

  show(): void {
    this.element.style.display = "block";
  }

  maximize(): void {
    if (this.isMaximized) return;

    this.previous = {
      x: this.element.offsetLeft,
      y: this.element.offsetTop,
      width: this.element.offsetWidth,
      height: this.element.offsetHeight
    };

    this.element.style.left = "0";
    this.element.style.top = "0";
    this.element.style.width = "100%";
    this.element.style.height = "100%";

    this.isMaximized = true;

    const btn = this.element.querySelector(".win-max");
    if (btn) btn.textContent = "❐";
  }

  restore(): void {
    if (!this.isMaximized) return;

    this.element.style.left = `${this.previous.x}px`;
    this.element.style.top = `${this.previous.y}px`;
    this.element.style.width = `${this.previous.width}px`;
    this.element.style.height = `${this.previous.height}px`;

    this.isMaximized = false;

    const btn = this.element.querySelector(".win-max");
    if (btn) btn.textContent = "□";
  }

  setActive(active: boolean): void {
    this.element.classList.toggle("active", active);
  }

  setZIndex(z: number): void {
    this.element.style.zIndex = String(z);
  }

  destroy(): void {
    this.element.remove();
  }

  getTitle(): string {
    return this.config.title;
  }
}
