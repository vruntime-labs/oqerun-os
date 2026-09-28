export class Drag {
  static enable(windowEl: HTMLElement): void {
    const titlebar = windowEl.querySelector(".window-titlebar") as HTMLElement;
    if (!titlebar) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    titlebar.addEventListener("pointerdown", (e: PointerEvent) => {
      // Don't drag when clicking window controls
      const target = e.target as HTMLElement;
      if (target.closest(".window-controls")) return;

      dragging = true;

      const rect = windowEl.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      windowEl.style.zIndex = String(Date.now());
      titlebar.setPointerCapture(e.pointerId);
    });

    titlebar.addEventListener("pointermove", (e: PointerEvent) => {
      if (!dragging) return;

      windowEl.style.left = `${e.clientX - offsetX}px`;
      windowEl.style.top = `${e.clientY - offsetY}px`;
    });

    const stopDrag = () => {
      dragging = false;
    };

    titlebar.addEventListener("pointerup", stopDrag);
    titlebar.addEventListener("pointercancel", stopDrag);
  }
}
