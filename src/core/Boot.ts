export class Boot {
  private readonly steps = [
    "Initializing Kernel...",
    "Loading System Services...",
    "Preparing Desktop..."
  ];

  async start(update?: (text: string) => void): Promise<void> {
    for (const step of this.steps) {
      update?.(step);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    update?.("Ready.");
  }
}
