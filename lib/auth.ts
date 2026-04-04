import jwt, { type JwtPayload } from "jsonwebtoken";

export type AuthRole = "admin" | "manager" | "employee" | "hr" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";
export type AuthSessionType = "super-admin" | "organization";
export type EntityStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type PlanName = "FREE" | "PRO" | "ENTERPRISE";

export type AuthTokenPayload = {
  sub: string;
  email?: string;
  name?: string;
  role: AuthRole;
  orgId?: string;
  orgStatus?: EntityStatus | null;
  userStatus?: EntityStatus;
  plan?: PlanName | null;
  sessionType?: AuthSessionType;
} & JwtPayload;

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signAuthToken(payload: Omit<AuthTokenPayload, keyof JwtPayload>) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

