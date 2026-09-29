import type {
  CloudProvider,
  CloudProviderStatus
} from "./CloudProvider";
import type {
  KloudlessAccount,
  KloudlessSelection,
  KloudlessPicker
} from "./Kloudless";

const KLOUDLESS_SCRIPT =
  "https://static-cdn.kloudless.com/p/platform/sdk/kloudless.picker.js";

type UnifiedCloudCallbacks = {
  onAccountConnected?: (account: KloudlessAccount) => void;
  onAccountDisconnected?: (accountId: string | number) => void;
  onSelection?: (items: KloudlessSelection[]) => void;
  onError?: (message: string) => void;
  onConfigurationRequired?: () => void;
};

export class KloudlessCloudProvider
  implements CloudProvider
{
  readonly id = "unified-cloud";
  readonly name = "Unified Cloud";
  readonly description =
    "Google Drive, OneDrive, Dropbox and other file-storage providers.";

  private picker: KloudlessPicker | null = null;
  private scriptPromise: Promise<void> | null = null;

  private readonly connectedAccounts =
    new Set<string>();

  constructor(
    private readonly callbacks: UnifiedCloudCallbacks = {}
  ) {}

  get status(): CloudProviderStatus {
    if (!this.appId) {
      return "configuration-required";
    }

    return this.connectedAccounts.size > 0
      ? "connected"
      : "available";
  }

  async connect(): Promise<void> {
    if (!this.appId) {
      this.callbacks.onConfigurationRequired?.();

      throw new Error(
        "Unified Cloud is not configured yet. Add VITE_KLOUDLESS_APP_ID and rebuild Oqerun."
      );
    }

    await this.loadScript();

    const filePicker =
      window.Kloudless?.filePicker;

    if (!filePicker) {
      throw new Error(
        "The unified cloud picker could not be loaded."
      );
    }

    if (this.picker) {
      this.picker.choose();
      return;
    }

    const picker =
      filePicker.picker({
        app_id: this.appId,

        services: [
          "file_store"
        ],

        types: [
          "all"
        ],

        multiselect: true,

        /*
         * Oqerun only needs picker results at this stage.
         * Do not expose Kloudless bearer tokens to the app.
         */
        retrieve_token: false,

        /*
         * Keep the picker session-scoped while the unified
         * Explorer architecture is being built.
         */
        persist: "session",

        account_management: true,
        enable_logout: true,
        delete_accounts_on_logout: true,

        display_backdrop: true,
        create_folder: true,
        close_on_success: true,

        custom_style_vars: {
          main_color: "#00D4FF"
        }
      });

    this.picker = picker;

    picker.on(
      "addAccount",
      payload => {
        const account =
          payload as KloudlessAccount | undefined;

        if (!account) return;

        const accountKey =
          String(account.id);

        this.connectedAccounts.add(
          accountKey
        );

        this.callbacks.onAccountConnected?.(
          account
        );
      }
    );

    picker.on(
      "deleteAccount",
      payload => {
        if (
          payload === undefined ||
          payload === null
        ) {
          return;
        }

        const accountId =
          typeof payload === "object" &&
          "id" in payload
            ? String(
                (payload as { id: unknown }).id
              )
            : String(payload);

        this.connectedAccounts.delete(
          accountId
        );

        this.callbacks.onAccountDisconnected?.(
          accountId
        );
      }
    );

    picker.on(
      "success",
      payload => {
        const items =
          Array.isArray(payload)
            ? payload as KloudlessSelection[]
            : [];

        this.callbacks.onSelection?.(
          items
        );
      }
    );

    picker.on(
      "error",
      payload => {
        const message =
          this.extractErrorMessage(payload);

        this.callbacks.onError?.(
          message
        );
      }
    );

    picker.choose();
  }

  async disconnect(): Promise<void> {
    if (!this.picker) {
      return;
    }

    /*
     * Kloudless exposes logout at picker level.
     * deleteAccount=true also invalidates the connected
     * provider tokens on the Kloudless side.
     */
    this.picker.logout(true);
    this.connectedAccounts.clear();
  }

  private get appId(): string {
    return (
      import.meta.env
        .VITE_KLOUDLESS_APP_ID || ""
    ).trim();
  }

  private loadScript(): Promise<void> {
    if (
      window.Kloudless?.filePicker
    ) {
      return Promise.resolve();
    }

    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise =
      new Promise<void>(
        (resolve, reject) => {
          const existing =
            document.querySelector<HTMLScriptElement>(
              'script[data-oqerun-kloudless="true"]'
            );

          if (existing) {
            existing.addEventListener(
              "load",
              () => resolve(),
              { once: true }
            );

            existing.addEventListener(
              "error",
              () =>
                reject(
                  new Error(
                    "The unified cloud picker script failed to load."
                  )
                ),
              { once: true }
            );

            return;
          }

          const script =
            document.createElement(
              "script"
            );

          script.src =
            KLOUDLESS_SCRIPT;

          script.async = true;

          script.dataset.oqerunKloudless =
            "true";

          script.onload = () => {
            if (
              window.Kloudless?.filePicker
            ) {
              resolve();
              return;
            }

            reject(
              new Error(
                "The unified cloud picker loaded without its API."
              )
            );
          };

          script.onerror = () => {
            reject(
              new Error(
                "The unified cloud picker script failed to load."
              )
            );
          };

          document.head.appendChild(
            script
          );
        }
      );

    return this.scriptPromise;
  }

  private extractErrorMessage(
    payload: unknown
  ): string {
    if (
      payload &&
      typeof payload === "object"
    ) {
      const value =
        payload as {
          error?: unknown;
          message?: unknown;
        };

      if (
        typeof value.message ===
        "string"
      ) {
        return value.message;
      }

      if (
        value.error &&
        typeof value.error ===
          "object" &&
        "message" in value.error
      ) {
        const message =
          (value.error as {
            message?: unknown;
          }).message;

        if (
          typeof message ===
          "string"
        ) {
          return message;
        }
      }
    }

    return "The unified cloud picker could not complete the request.";
  }
}
