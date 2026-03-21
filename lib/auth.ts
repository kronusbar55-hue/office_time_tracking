import jwt from "jsonwebtoken";

export type AuthRole = "admin" | "manager" | "employee" | "hr" | "SUPER_ADMIN";

export type AuthTokenPayload = {
  sub: string;
  name?: string;
  role: AuthRole;
  orgId?: string; // organizationId can be null for Super Admin
};

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

