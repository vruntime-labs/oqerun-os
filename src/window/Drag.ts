export class Drag {
  static enable(windowEl: HTMLElement): void {
    const titlebar = windowEl.querySelector(".window-titlebar") as HTMLElement;
    if (!titlebar) return;

    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    titlebar.addEventListener("pointerdown", (e) => {
      dragging = true;

      const rect = windowEl.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      titlebar.setPointerCapture(e.pointerId);
    });

    titlebar.addEventListener("pointermove", (e) => {
      if (!dragging) return;

      windowEl.style.left = `${e.clientX - offsetX}px`;
      windowEl.style.top = `${e.clientY - offsetY}px`;
    });

    titlebar.addEventListener("pointerup", () => {
      dragging = false;
    });
  }
}
