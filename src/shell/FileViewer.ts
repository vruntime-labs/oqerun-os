import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";

type FileKind =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "unsupported";

export class FileViewer {
  private static nextInstance = 1;

  constructor(
    private kernel: Kernel,
    private wm: WindowManager
  ) {}

  async open(
    handle: FileSystemFileHandle
  ): Promise<void> {
    try {
      const file = await handle.getFile();
      const kind = this.detectKind(file);

      if (kind === "unsupported") {
        this.kernel.notify.info(
          "File type not supported yet",
          `"${file.name}" is recognized as ${file.type || "an unknown file type"}. A dedicated Oqerun app for this format will be connected later.`
        );
        return;
      }

      const instanceId =
        `file-viewer-${FileViewer.nextInstance++}`;

      const title =
        `${this.titleFor(kind)} — ${file.name}`;

      this.wm.open({
        id: instanceId,
        title,
        width: this.getWidth(kind),
        height: this.getHeight(kind),
        x: 120 + ((FileViewer.nextInstance - 2) % 4) * 24,
        y: 70 + ((FileViewer.nextInstance - 2) % 4) * 24,
        content: this.loadingMarkup(file)
      });

      requestAnimationFrame(() => {
        void this.renderFile(instanceId, file, kind);
      });
    } catch (error) {
      this.kernel.notify.error(
        "Open file failed",
        this.describeError(error)
      );
    }
  }

  private async renderFile(
    windowId: string,
    file: File,
    kind: FileKind
  ): Promise<void> {
    const win = document.getElementById(windowId);

    const content =
      win?.querySelector(".window-content") as HTMLElement | null;

    if (!content) return;

    try {
      if (kind === "text") {
        await this.renderText(content, file);
        return;
      }

      if (kind === "image") {
        this.renderImage(content, file);
        return;
      }

      if (kind === "audio") {
        this.renderAudio(content, file);
        return;
      }

      if (kind === "video") {
        this.renderVideo(content, file);
        return;
      }

      if (kind === "pdf") {
        this.renderPdf(content, file);
      }
    } catch (error) {
      content.innerHTML = this.errorMarkup(
        this.describeError(error)
      );
    }
  }

  private async renderText(
    content: HTMLElement,
    file: File
  ): Promise<void> {
    const maxBytes = 2 * 1024 * 1024;

    if (file.size > maxBytes) {
      content.innerHTML = this.errorMarkup(
        "This text file is larger than 2 MB. Large-file editing will be added with the Text Editor."
      );
      return;
    }

    const text = await file.text();

    content.innerHTML = `
      <div class="file-viewer text-file-viewer">
        <div class="file-viewer-meta">
          <span>${this.escapeHtml(file.name)}</span>
          <span>${this.formatBytes(file.size)}</span>
        </div>

        <pre class="file-viewer-text">${this.escapeHtml(text)}</pre>
      </div>
    `;
  }

  private renderImage(
    content: HTMLElement,
    file: File
  ): void {
    const url = URL.createObjectURL(file);

    content.innerHTML = `
      <div class="file-viewer media-file-viewer">
        <div class="file-viewer-meta">
          <span>${this.escapeHtml(file.name)}</span>
          <span>${this.escapeHtml(file.type || "image")}</span>
        </div>

        <div class="file-viewer-media-stage">
          <img
            class="file-viewer-image"
            src="${url}"
            alt="${this.escapeAttribute(file.name)}"
            draggable="false"
          />
        </div>
      </div>
    `;

    const image =
      content.querySelector<HTMLImageElement>(
        ".file-viewer-image"
      );

    image?.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(url);
        content.innerHTML = this.errorMarkup(
          "The browser could not decode this image."
        );
      },
      { once: true }
    );

    /*
     * Keep the object URL alive while the image is visible.
     * The viewer is intentionally session-scoped for now.
     */
  }

  private renderAudio(
    content: HTMLElement,
    file: File
  ): void {
    const url = URL.createObjectURL(file);

    content.innerHTML = `
      <div class="file-viewer media-file-viewer">
        <div class="file-viewer-meta">
          <span>${this.escapeHtml(file.name)}</span>
          <span>${this.escapeHtml(file.type || "audio")}</span>
        </div>

        <div class="file-viewer-media-stage audio-stage">
          <div class="file-viewer-media-icon" aria-hidden="true">♫</div>
          <audio
            class="file-viewer-audio"
            controls
            preload="metadata"
            src="${url}"
          >
            Your browser could not play this audio file.
          </audio>
        </div>
      </div>
    `;

    this.bindMediaError(
      content.querySelector<HTMLMediaElement>(
        ".file-viewer-audio"
      ),
      content,
      url,
      "The browser could not play this audio file."
    );
  }

  private renderVideo(
    content: HTMLElement,
    file: File
  ): void {
    const url = URL.createObjectURL(file);

    content.innerHTML = `
      <div class="file-viewer media-file-viewer">
        <div class="file-viewer-meta">
          <span>${this.escapeHtml(file.name)}</span>
          <span>${this.escapeHtml(file.type || "video")}</span>
        </div>

        <div class="file-viewer-media-stage video-stage">
          <video
            class="file-viewer-video"
            controls
            preload="metadata"
            src="${url}"
          >
            Your browser could not play this video file.
          </video>
        </div>
      </div>
    `;

    this.bindMediaError(
      content.querySelector<HTMLMediaElement>(
        ".file-viewer-video"
      ),
      content,
      url,
      "The browser could not play this video file."
    );
  }

  private renderPdf(
    content: HTMLElement,
    file: File
  ): void {
    const url = URL.createObjectURL(file);

    content.innerHTML = `
      <div class="file-viewer pdf-file-viewer">
        <div class="file-viewer-meta">
          <span>${this.escapeHtml(file.name)}</span>
          <span>PDF</span>
        </div>

        <iframe
          class="file-viewer-pdf"
          src="${url}"
          title="${this.escapeAttribute(file.name)}"
        ></iframe>
      </div>
    `;
  }

  private bindMediaError(
    media: HTMLMediaElement | null,
    content: HTMLElement,
    url: string,
    message: string
  ): void {
    media?.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(url);
        content.innerHTML = this.errorMarkup(message);
      },
      { once: true }
    );
  }

  private detectKind(file: File): FileKind {
    const mime = file.type.toLowerCase();
    const extension = this.getExtension(file.name);

    if (
      mime.startsWith("text/") ||
      mime === "application/json" ||
      mime === "application/javascript" ||
      mime === "application/xml" ||
      this.textExtensions.has(extension)
    ) {
      return "text";
    }

    if (
      mime.startsWith("image/") ||
      this.imageExtensions.has(extension)
    ) {
      return "image";
    }

    if (
      mime.startsWith("audio/") ||
      this.audioExtensions.has(extension)
    ) {
      return "audio";
    }

    if (
      mime.startsWith("video/") ||
      this.videoExtensions.has(extension)
    ) {
      return "video";
    }

    if (
      mime === "application/pdf" ||
      extension === "pdf"
    ) {
      return "pdf";
    }

    return "unsupported";
  }

  private readonly textExtensions = new Set([
    "txt",
    "md",
    "markdown",
    "json",
    "csv",
    "log",
    "xml",
    "html",
    "htm",
    "css",
    "js",
    "mjs",
    "cjs",
    "ts",
    "mts",
    "cts",
    "jsx",
    "tsx",
    "yaml",
    "yml",
    "toml",
    "ini",
    "conf",
    "sh",
    "bat",
    "ps1",
    "sql"
  ]);

  private readonly imageExtensions = new Set([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
    "avif"
  ]);

  private readonly audioExtensions = new Set([
    "mp3",
    "wav",
    "ogg",
    "oga",
    "opus",
    "m4a",
    "aac",
    "flac"
  ]);

  private readonly videoExtensions = new Set([
    "mp4",
    "webm",
    "ogv",
    "mov",
    "m4v",
    "avi",
    "mkv"
  ]);

  private getExtension(name: string): string {
    const dot = name.lastIndexOf(".");

    if (dot <= 0 || dot === name.length - 1) {
      return "";
    }

    return name.slice(dot + 1).toLowerCase();
  }

  private titleFor(kind: FileKind): string {
    switch (kind) {
      case "text":
        return "Text Viewer";
      case "image":
        return "Image Viewer";
      case "audio":
        return "Music Player";
      case "video":
        return "Video Player";
      case "pdf":
        return "PDF Viewer";
      default:
        return "File Viewer";
    }
  }

  private getWidth(kind: FileKind): number {
    switch (kind) {
      case "image":
      case "video":
      case "pdf":
        return 820;
      default:
        return 700;
    }
  }

  private getHeight(kind: FileKind): number {
    switch (kind) {
      case "image":
      case "video":
      case "pdf":
        return 560;
      default:
        return 500;
    }
  }

  private loadingMarkup(file: File): string {
    return `
      <div class="file-viewer-loading">
        <strong>Opening file</strong>
        <span>${this.escapeHtml(file.name)}</span>
      </div>
    `;
  }

  private errorMarkup(message: string): string {
    return `
      <div class="file-viewer-error">
        <strong>Unable to open file</strong>
        <span>${this.escapeHtml(message)}</span>
      </div>
    `;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }

  private describeError(error: unknown): string {
    if (error instanceof DOMException) {
      return error.message || error.name;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "The browser could not access this file.";
  }
}
