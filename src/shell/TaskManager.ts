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
      const content = win?.querySelector(".window-content") as HTMLElement | null;
      if (content) content.innerHTML = render();
      this.attach(id, render);
    });
  }

  private attach(id: string, render: () => string): void {
    const win = document.getElementById(id);
    const content = win?.querySelector(".window-content") as HTMLElement | null;
    if (!content || content.dataset.processActionsBound === "1") return;

    content.dataset.processActionsBound = "1";
    content.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      if (target.closest("[data-refresh]")) {
        content.innerHTML = render();
        return;
      }

      const stopButton = target.closest<HTMLElement>("[data-stop]");
      if (!stopButton) return;

      const pid = Number(stopButton.dataset.stop);
      if (!Number.isInteger(pid) || pid <= 0) return;

      if (this.wm.endProcess(pid)) {
        this.kernel.notify.success("Task Manager", `Process ${pid} ended.`);
        if (document.getElementById(id)) {
          content.innerHTML = render();
        }
      }
    });
  }

  private escape(value: string): string {
    return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }
}
