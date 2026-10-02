import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

export class TaskManager {
  constructor(private kernel: Kernel, private wm: WindowManager) {}

  open(): void {
    const id = "task-manager";
    const render = () => {
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
    };

    this.wm.open({
      id,
      title: "Task Manager",
      width: 700,
      height: 460,
      x: 150,
      y: 90,
      content: render()
    });

    requestAnimationFrame(() => {
      const win = document.getElementById(id);
      win?.querySelector("[data-refresh]")?.addEventListener("click", () => {
        const content = win.querySelector(".window-content") as HTMLElement | null;
        if (content) content.innerHTML = render();
        this.attach(id);
      });
      this.attach(id);
    });
  }

  private attach(id: string): void {
    const win = document.getElementById(id);
    if (!win) return;

    win.querySelectorAll<HTMLElement>("[data-stop]").forEach((button) => {
      button.addEventListener("click", () => {
        const pid = Number(button.dataset.stop);
        if (this.kernel.processes.stop(pid)) {
          this.kernel.notify.success("Task Manager", `Process ${pid} ended.`);
          const content = win.querySelector(".window-content") as HTMLElement | null;
          if (content) content.innerHTML = `
            <div class="task-manager">
              <div class="task-manager-head"><div><strong>Task Manager</strong><span>Oqerun processes</span></div></div>
              <div class="task-empty">Process ended. Reopen Task Manager to refresh.</div>
            </div>`;
        }
      });
    });
  }

  private escape(value: string): string {
    return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }
}
