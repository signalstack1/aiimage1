const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const PREFIX = "ss_admin_";

export function makeToken(): string {
  const raw = `${ADMIN_PASSWORD}|${Date.now()}`;
  return PREFIX + Buffer.from(raw).toString("base64");
}

export function verifyToken(token: string): boolean {
  if (!token.startsWith(PREFIX)) return false;
  try {
    const raw = Buffer.from(token.slice(PREFIX.length), "base64").toString();
    const [pw, tsStr] = raw.split("|");
    if (pw !== ADMIN_PASSWORD) return false;
    if (Date.now() - Number(tsStr) > 30 * 24 * 60 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

export function checkAdminAuth(authHeader: string | undefined): boolean {
  const token = (authHeader || "").replace("Bearer ", "");
  return verifyToken(token);
}

export { ADMIN_PASSWORD };
