export type NotificationType = "info" | "success" | "warning" | "error";

interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
  duration?: number;
}

export class NotificationService {
  private container!: HTMLDivElement;

  constructor() {
    this.createContainer();
  }

  private createContainer(): void {
    const existing = document.getElementById("oq-notifications");

    if (existing) {
      this.container = existing as HTMLDivElement;
      return;
    }

    this.container = document.createElement("div");
    this.container.id = "oq-notifications";

    document.body.appendChild(this.container);
  }

  notify(options: NotificationOptions): void {
    const toast = document.createElement("div");

    toast.className = `oq-toast ${options.type ?? "info"}`;

    toast.innerHTML = `
      <div class="oq-toast-title">${options.title}</div>
      <div class="oq-toast-message">${options.message}</div>
    `;

    this.container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    const duration = options.duration ?? 3000;

    setTimeout(() => {
      toast.classList.remove("show");

      setTimeout(() => toast.remove(), 220);
    }, duration);
  }

  info(title: string, message: string): void {
    this.notify({ title, message, type: "info" });
  }

  success(title: string, message: string): void {
    this.notify({ title, message, type: "success" });
  }

  warning(title: string, message: string): void {
    this.notify({ title, message, type: "warning" });
  }

  error(title: string, message: string): void {
    this.notify({ title, message, type: "error" });
  }
}
