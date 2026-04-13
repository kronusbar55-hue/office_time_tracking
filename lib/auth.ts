import jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  role: "super-admin" | "admin" | "manager" | "employee" | "hr";
  tenantId?: string | null;
  sessionId?: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signAuthToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
