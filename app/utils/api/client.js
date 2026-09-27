import { getFixedT } from "../../i18n/config";

// Generic fetch wrapper shared by every resource file in app/utils/api/.
// Every backend endpoint lives at /api/<name> (see app/routes/api/<name>.jsx,
// auto-registered by app/routes.js); each resource file here (e.g. shop.js)
// wraps those endpoints in human-readable functions the frontend calls directly.
export async function apiFetch(path, { method = "GET", body } = {}) {
  // The page's language (root.jsx sets <html lang>), so the server returns
  // errors in the language the merchant is already reading.
  const locale = typeof document !== "undefined" ? document.documentElement.lang : "";

  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(locale ? { "Accept-Language": locale } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || getFixedT(locale || undefined)("errors.requestFailed", { status: response.status }),
    );
  }

  return data;
}
