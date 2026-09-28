export interface Process {
  pid: number;
  name: string;
  state: "running" | "closed";
  startedAt: number;
}

export class ProcessManager {
  private nextPid = 1;
  private processes = new Map<number, Process>();

  create(name: string): number {
    const pid = this.nextPid++;

    this.processes.set(pid, {
      pid,
      name,
      state: "running",
      startedAt: Date.now()
    });

    console.log(`[PID ${pid}] ${name} started`);
    return pid;
  }

  kill(pid: number): void {
    const process = this.processes.get(pid);
    if (!process) return;

    process.state = "closed";
    this.processes.delete(pid);

    console.log(`[PID ${pid}] ${process.name} closed`);
  }

  list(): Process[] {
    return [...this.processes.values()];
  }
}
