/** Defense-in-depth guard for cookie-authenticated POST routes (not a full CSRF token). */
export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  // Same-origin browser POSTs often omit Origin; rely on SameSite cookies for that case.
  if (!origin) return true;

  return origin === new URL(request.url).origin;
}
