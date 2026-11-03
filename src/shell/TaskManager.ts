import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class TaskManager {
  constructor(private kernel: Kernel, private wm: WindowManager) {}

  open(): void {
    const id = "task-manager";

    this.wm.open({
      id,
      title: "Task Manager",
      width: 700,
      height: 460,
      x: 150,
      y: 90,
      content: this.renderContent()
    });

    // WindowManager registers the Task Manager process during open().
    // Refresh after the window is mounted so its own PID is visible too.
    requestAnimationFrame(() => this.refresh(id));
  }

  private renderContent(): string {
    const processes = this.kernel.processes.list();

    return `
      <div class="task-manager">
        <div class="task-manager-head">
          <div>
            <strong>Task Manager</strong>
            <span>Oqerun processes</span>
          </div>
          <button type="button" data-refresh>Refresh</button>
        </div>
        <div class="task-manager-list">
          ${processes.length ? processes.map((process) => `
            <div class="task-row">
              <span>${process.pid}</span>
              <strong>${this.escape(process.name)}</strong>
              <span>${process.state}</span>
              <span>${new Date(process.startedAt).toLocaleTimeString()}</span>
              <button type="button" data-stop="${process.pid}">End</button>
            </div>
          `).join("") : `
            <div class="task-empty">No Oqerun processes are currently registered.</div>
          `}
        </div>
      </div>
    `;
  }

  private refresh(id: string): void {
    const win = document.getElementById(id);
    const content = win?.querySelector(".window-content") as HTMLElement | null;
    if (!win || !content) return;

    content.innerHTML = this.renderContent();
    this.attach(id);
  }

  private attach(id: string): void {
    const win = document.getElementById(id);
    if (!win) return;

    win.querySelector("[data-refresh]")?.addEventListener("click", () => {
      this.refresh(id);
    });

    win.querySelectorAll<HTMLElement>("[data-stop]").forEach((button) => {
      button.addEventListener("click", () => {
        const pid = Number(button.dataset.stop);
        if (!Number.isInteger(pid) || pid <= 0) return;

        if (this.wm.endProcess(pid)) {
          this.kernel.notify.success("Task Manager", `Process ${pid} ended.`);
          this.refresh(id);
        } else {
          this.kernel.notify.info("Task Manager", `Process ${pid} is no longer running.`);
          this.refresh(id);
        }
      });
    });
  }

  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}
