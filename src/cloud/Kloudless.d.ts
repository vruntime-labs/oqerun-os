export interface KloudlessAccount {
  id: string | number;
  name?: string;
  service?: string;
}

export interface KloudlessSelection {
  id?: string;
  name?: string;
  type?: "file" | "folder" | string;
  account?: string | number;
  service?: string;
  mime_type?: string;
  size?: number;
  [key: string]: unknown;
}

export interface KloudlessPickerOptions {
  app_id: string;
  services?: string[];
  types?: string[];
  multiselect?: boolean;
  link?: boolean;
  retrieve_token?: boolean;
  persist?: "none" | "local" | "session";
  account_management?: boolean;
  enable_logout?: boolean;
  delete_accounts_on_logout?: boolean;
  display_backdrop?: boolean;
  create_folder?: boolean;
  close_on_success?: boolean;
  custom_style_vars?: Record<string, string>;
}

export interface KloudlessPicker {
  choose(): void;
  close(): void;
  destroy(): void;
  logout(deleteAccount?: boolean): void;
  on(
    event:
      | "success"
      | "cancel"
      | "error"
      | "open"
      | "close"
      | "selected"
      | "addAccount"
      | "deleteAccount",
    callback: (payload?: unknown) => void
  ): void;
}

export interface KloudlessFilePicker {
  picker(
    options: KloudlessPickerOptions
  ): KloudlessPicker;
}

declare global {
  interface Window {
    Kloudless?: {
      filePicker: KloudlessFilePicker;
    };
  }
}

export {};
