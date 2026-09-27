export class StartMenu {
  private isOpen = false;

  toggle(): void {
    const menu = document.getElementById("start-menu");
    if (!menu) return;

    this.isOpen = !this.isOpen;
    menu.style.display = this.isOpen ? "flex" : "none";
  }
}
