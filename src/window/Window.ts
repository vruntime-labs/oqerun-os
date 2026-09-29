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

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

export class Window {
  private element!: HTMLDivElement;
  private titlebar!: HTMLDivElement;

  private isDragging = false;
  private isResizing = false;

  private dragX = 0;
  private dragY = 0;

  private resizeDirection: ResizeDirection | null = null;

  private resizeStartX = 0;
  private resizeStartY = 0;

  private resizeStartLeft = 0;
  private resizeStartTop = 0;

  private resizeStartWidth = 0;
  private resizeStartHeight = 0;

  private isMaximized = false;

  private previous = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };

  private readonly minWidth = 300;
  private readonly minHeight = 200;

  constructor(private config: WindowConfig) {}

  render(): void {
    const desktop =
      document.querySelector(".desktop-area") ||
      document.getElementById("desktop");

    if (!desktop) return;

    this.element = document.createElement("div");

    this.element.id = this.config.id;
    this.element.className = "oq-window";

    this.element.style.width =
      `${this.config.width ?? 520}px`;

    this.element.style.height =
      `${this.config.height ?? 380}px`;

    this.element.style.left =
      `${this.config.x ?? 120}px`;

    this.element.style.top =
      `${this.config.y ?? 80}px`;

    this.element.innerHTML = `
      <div class="window-titlebar">

        <span class="window-title">
          ${this.config.title}
        </span>

        <div class="window-controls">

          <button
            class="win-min"
            type="button"
            title="Minimize"
            aria-label="Minimize"
          >
            —
          </button>

          <button
            class="win-max"
            type="button"
            title="Maximize"
            aria-label="Maximize"
          >
            □
          </button>

          <button
            class="win-close"
            type="button"
            title="Close"
            aria-label="Close"
          >
            ×
          </button>

        </div>

      </div>

      <div class="window-content">
        ${this.config.content}
      </div>

      <div
        class="window-resize-handle resize-n"
        data-resize="n"
      ></div>

      <div
        class="window-resize-handle resize-s"
        data-resize="s"
      ></div>

      <div
        class="window-resize-handle resize-e"
        data-resize="e"
      ></div>

      <div
        class="window-resize-handle resize-w"
        data-resize="w"
      ></div>

      <div
        class="window-resize-handle resize-ne"
        data-resize="ne"
      ></div>

      <div
        class="window-resize-handle resize-nw"
        data-resize="nw"
      ></div>

      <div
        class="window-resize-handle resize-se"
        data-resize="se"
      ></div>

      <div
        class="window-resize-handle resize-sw"
        data-resize="sw"
      ></div>
    `;

    desktop.appendChild(this.element);

    this.titlebar =
      this.element.querySelector(
        ".window-titlebar"
      ) as HTMLDivElement;

    this.attachEvents();
  }

  private attachEvents(): void {

    /*
     * Focus window whenever it is clicked.
     */
    this.element.addEventListener(
      "mousedown",
      (event) => {

        const target =
          event.target as HTMLElement;

        if (
          target.closest(".window-controls") ||
          target.closest(".window-resize-handle")
        ) {
          return;
        }

        this.config.onFocus?.();
      }
    );

    /*
     * Drag window.
     */
    this.titlebar.addEventListener(
      "mousedown",
      (event: MouseEvent) => {

        if (this.isMaximized) return;

        const target =
          event.target as HTMLElement;

        if (
          target.closest(".window-controls")
        ) {
          return;
        }

        this.config.onFocus?.();

        const rect =
          this.element.getBoundingClientRect();

        this.isDragging = true;

        this.dragX =
          event.clientX - rect.left;

        this.dragY =
          event.clientY - rect.top;

        document.addEventListener(
          "mousemove",
          this.onDrag
        );

        document.addEventListener(
          "mouseup",
          this.stopDrag
        );
      }
    );

    /*
     * Close.
     */
    this.element
      .querySelector(".win-close")
      ?.addEventListener(
        "click",
        () => {
          this.config.onClose?.();
        }
      );

    /*
     * Minimize.
     */
    this.element
      .querySelector(".win-min")
      ?.addEventListener(
        "click",
        () => {
          this.config.onMinimize?.();
        }
      );

    /*
     * Maximize / restore.
     */
    this.element
      .querySelector(".win-max")
      ?.addEventListener(
        "click",
        () => {
          this.config.onMaximize?.();
        }
      );

    /*
     * Double-click title bar to maximize.
     */
    this.titlebar.addEventListener(
      "dblclick",
      (event) => {

        const target =
          event.target as HTMLElement;

        if (
          target.closest(".window-controls")
        ) {
          return;
        }

        this.config.onMaximize?.();
      }
    );

    /*
     * Resize handles.
     */
    this.element
      .querySelectorAll<HTMLElement>(
        ".window-resize-handle"
      )
      .forEach((handle) => {

        handle.addEventListener(
          "mousedown",
          (event: MouseEvent) => {

            event.preventDefault();
            event.stopPropagation();

            if (this.isMaximized) return;

            const direction =
              handle.dataset.resize as
                | ResizeDirection
                | undefined;

            if (!direction) return;

            this.startResize(
              direction,
              event
            );
          }
        );
      });
  }

  private onDrag = (
    event: MouseEvent
  ): void => {

    if (!this.isDragging) return;

    const desktop =
      document.querySelector(
        ".desktop-area"
      ) as HTMLElement | null;

    if (!desktop) return;

    const desktopRect =
      desktop.getBoundingClientRect();

    const width =
      this.element.offsetWidth;

    const height =
      this.element.offsetHeight;

    let left =
      event.clientX -
      desktopRect.left -
      this.dragX;

    let top =
      event.clientY -
      desktopRect.top -
      this.dragY;

    const maxLeft =
      Math.max(
        0,
        desktopRect.width - width
      );

    const maxTop =
      Math.max(
        0,
        desktopRect.height - height
      );

    left =
      Math.max(
        0,
        Math.min(left, maxLeft)
      );

    top =
      Math.max(
        0,
        Math.min(top, maxTop)
      );

    this.element.style.left =
      `${left}px`;

    this.element.style.top =
      `${top}px`;
  };

  private stopDrag = (): void => {

    this.isDragging = false;

    document.removeEventListener(
      "mousemove",
      this.onDrag
    );

    document.removeEventListener(
      "mouseup",
      this.stopDrag
    );
  };

  private startResize(
    direction: ResizeDirection,
    event: MouseEvent
  ): void {

    const rect =
      this.element.getBoundingClientRect();

    const desktop =
      document.querySelector(
        ".desktop-area"
      ) as HTMLElement | null;

    if (!desktop) return;

    const desktopRect =
      desktop.getBoundingClientRect();

    this.isResizing = true;

    this.resizeDirection =
      direction;

    this.resizeStartX =
      event.clientX;

    this.resizeStartY =
      event.clientY;

    this.resizeStartLeft =
      rect.left -
      desktopRect.left;

    this.resizeStartTop =
      rect.top -
      desktopRect.top;

    this.resizeStartWidth =
      rect.width;

    this.resizeStartHeight =
      rect.height;

    this.config.onFocus?.();

    document.addEventListener(
      "mousemove",
      this.onResize
    );

    document.addEventListener(
      "mouseup",
      this.stopResize
    );
  }

  private onResize = (
    event: MouseEvent
  ): void => {

    if (
      !this.isResizing ||
      !this.resizeDirection
    ) {
      return;
    }

    const desktop =
      document.querySelector(
        ".desktop-area"
      ) as HTMLElement | null;

    if (!desktop) return;

    const desktopRect =
      desktop.getBoundingClientRect();

    const dx =
      event.clientX -
      this.resizeStartX;

    const dy =
      event.clientY -
      this.resizeStartY;

    let left =
      this.resizeStartLeft;

    let top =
      this.resizeStartTop;

    let width =
      this.resizeStartWidth;

    let height =
      this.resizeStartHeight;

    const direction =
      this.resizeDirection;

    /*
     * East.
     */
    if (
      direction.includes("e")
    ) {

      width =
        this.resizeStartWidth +
        dx;

      width =
        Math.max(
          this.minWidth,
          width
        );

      width =
        Math.min(
          width,
          desktopRect.width - left
        );
    }

    /*
     * South.
     */
    if (
      direction.includes("s")
    ) {

      height =
        this.resizeStartHeight +
        dy;

      height =
        Math.max(
          this.minHeight,
          height
        );

      height =
        Math.min(
          height,
          desktopRect.height - top
        );
    }

    /*
     * West.
     */
    if (
      direction.includes("w")
    ) {

      const proposedLeft =
        this.resizeStartLeft + dx;

      const maxLeft =
        this.resizeStartLeft +
        this.resizeStartWidth -
        this.minWidth;

      left =
        Math.max(
          0,
          Math.min(
            proposedLeft,
            maxLeft
          )
        );

      width =
        this.resizeStartWidth -
        (left -
          this.resizeStartLeft);
    }

    /*
     * North.
     */
    if (
      direction.includes("n")
    ) {

      const proposedTop =
        this.resizeStartTop + dy;

      const maxTop =
        this.resizeStartTop +
        this.resizeStartHeight -
        this.minHeight;

      top =
        Math.max(
          0,
          Math.min(
            proposedTop,
            maxTop
          )
        );

      height =
        this.resizeStartHeight -
        (top -
          this.resizeStartTop);
    }

    this.element.style.left =
      `${left}px`;

    this.element.style.top =
      `${top}px`;

    this.element.style.width =
      `${width}px`;

    this.element.style.height =
      `${height}px`;
  };

  private stopResize = (): void => {

    this.isResizing = false;
    this.resizeDirection = null;

    document.removeEventListener(
      "mousemove",
      this.onResize
    );

    document.removeEventListener(
      "mouseup",
      this.stopResize
    );
  };

  hide(): void {

    this.element.style.display =
      "none";
  }

  show(): void {

    this.element.style.display =
      "block";
  }

  maximize(): void {

    if (this.isMaximized) return;

    this.previous = {
      x: this.element.offsetLeft,
      y: this.element.offsetTop,
      width: this.element.offsetWidth,
      height: this.element.offsetHeight
    };

    this.element.style.left =
      "0px";

    this.element.style.top =
      "0px";

    this.element.style.width =
      "100%";

    this.element.style.height =
      "100%";

    this.isMaximized = true;

    const button =
      this.element.querySelector(
        ".win-max"
      );

    if (button) {
      button.textContent = "❐";
    }
  }

  restore(): void {

    if (!this.isMaximized) return;

    this.element.style.left =
      `${this.previous.x}px`;

    this.element.style.top =
      `${this.previous.y}px`;

    this.element.style.width =
      `${this.previous.width}px`;

    this.element.style.height =
      `${this.previous.height}px`;

    this.isMaximized = false;

    const button =
      this.element.querySelector(
        ".win-max"
      );

    if (button) {
      button.textContent = "□";
    }
  }

  setActive(
    active: boolean
  ): void {

    this.element.classList.toggle(
      "active",
      active
    );
  }

  setZIndex(
    z: number
  ): void {

    this.element.style.zIndex =
      String(z);
  }

  destroy(): void {

    this.stopDrag();
    this.stopResize();

    this.element.remove();
  }

  getTitle(): string {
    return this.config.title;
  }
}
