export type CloudProviderStatus =
  | "connected"
  | "available"
  | "configuration-required";

export interface CloudProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: CloudProviderStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
