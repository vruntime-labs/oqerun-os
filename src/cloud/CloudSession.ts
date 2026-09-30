const SESSION_STORAGE_KEY = "oqerun.google-drive.session";

export function getCloudSessionToken(): string | null {
  try {
    const token = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return token && /^[A-Za-z0-9_-]+$/.test(token)
      ? token
      : null;
  } catch {
    return null;
  }
}

export function setCloudSessionToken(token: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return;

  try {
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      token
    );
  } catch {
    // Session storage may be unavailable in restricted browsing modes.
  }
}

export function clearCloudSessionToken(): void {
  try {
    window.sessionStorage.removeItem(
      SESSION_STORAGE_KEY
    );
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function cloudAuthHeaders(): HeadersInit {
  const token = getCloudSessionToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}
