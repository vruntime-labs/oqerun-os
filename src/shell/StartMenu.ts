export class StartMenu {
  private isOpen = false;

  open(): void {
    const menu = document.getElementById("start-menu");
    if (!menu) return;

    this.isOpen = true;
    menu.style.display = "flex";
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  focusSearch(): void {
    const input = document.getElementById("app-search") as HTMLInputElement | null;
    if (!input) return;

    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  close(): void {
    const menu = document.getElementById("start-menu");
    if (!menu) return;

    this.isOpen = false;
    menu.style.display = "none";
  }
}
