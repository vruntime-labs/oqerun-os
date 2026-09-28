export interface Process {
  pid: number;
  name: string;
  state: "running" | "paused" | "stopped";
  startedAt: number;
}

export class ProcessManager {
  private processes = new Map<number, Process>();
  private nextPid = 1;

  start(name: string): number {
    const pid = this.nextPid++;

    this.processes.set(pid, {
      pid,
      name,
      state: "running",
      startedAt: Date.now()
    });

    return pid;
  }

  pause(pid: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;

    process.state = "paused";
    return true;
  }

  resume(pid: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;

    process.state = "running";
    return true;
  }

  stop(pid: number): boolean {
    return this.processes.delete(pid);
  }

  get(pid: number): Process | undefined {
    return this.processes.get(pid);
  }

  list(): Process[] {
    return [...this.processes.values()];
  }

  isRunning(pid: number): boolean {
    return this.processes.get(pid)?.state === "running";
  }
}
