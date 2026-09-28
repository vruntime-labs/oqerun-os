export class Boot {
  private readonly steps = [
    "Initializing Kernel...",
    "Loading System Services...",
    "Preparing Desktop...",
    "Ready."
  ];

  async start(): Promise<void> {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <div class="boot-screen" id="boot-screen">

        <img
          class="boot-logo"
          src="/oqerun-os/branding/logo.svg"
          alt="Oqerun Logo"
        >

        <h1 class="boot-title">Oqerun OS</h1>

        <div class="boot-version">v0.3 "Pulse"</div>

        <div id="boot-status" class="boot-status">Starting...</div>

        <div class="boot-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>

      </div>
    `;

    const status = document.getElementById("boot-status");

    for (const step of this.steps) {
      if (status) status.textContent = step;
      await new Promise(resolve => setTimeout(resolve, 650));
    }

    const boot = document.getElementById("boot-screen");

    if (boot) {
      boot.style.transition = "opacity .45s ease";
      boot.style.opacity = "0";
      await new Promise(resolve => setTimeout(resolve, 450));
    }
  }
}
