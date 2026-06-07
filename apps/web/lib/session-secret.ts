const DEV_SESSION_SECRET = "noeyarmory-dev-insecure-session-secret-change-me";
const MIN_SESSION_SECRET_LENGTH = 32;

export function getSessionPassword(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.SESSION_SECRET?.trim();
  if (secret && secret.length >= MIN_SESSION_SECRET_LENGTH) return secret;

  if (env.NODE_ENV === "production") {
    throw new Error(
      `SESSION_SECRET must be set to at least ${MIN_SESSION_SECRET_LENGTH} characters in production.`,
    );
  }

  return DEV_SESSION_SECRET;
}
