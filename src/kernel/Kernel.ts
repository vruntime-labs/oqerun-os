export class Kernel {
  readonly version = "0.1.0";
  readonly codename = "Boot";

  boot(): void {
    const app = document.getElementById("app");

    if (!app) return;

    app.innerHTML = `
      <main class="boot-screen">
        <h1>OQERUN OS</h1>
        <p>Version ${this.version} • "${this.codename}"</p>
        <p>Initializing Kernel...</p>
      </main>
    `;

    console.log(`Oqerun Kernel ${this.version} booted.`);
  }
}
