import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_ENV = "OQERUN_TOKEN_ENCRYPTION_KEY";

function getKey(): Buffer {
  const value = (process.env[KEY_ENV] ?? "").trim();

  if (!value) {
    throw new Error(`${KEY_ENV} is not configured.`);
  }

  const key = Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be a base64-encoded 32-byte key.`);
  }

  return key;
}

export function encryptSecret(value: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivPart, tagPart, encryptedPart] = payload.split(".");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted token payload.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url")
  );

  decipher.setAuthTag(
    Buffer.from(tagPart, "base64url")
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(encryptedPart, "base64url")
    ),
    decipher.final()
  ]).toString("utf8");
}

export function isTokenEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
