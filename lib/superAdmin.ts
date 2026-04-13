export const SUPER_ADMIN_ROLE = "super-admin" as const;

export const SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL || "superadmin@technotoil.com";

export const SUPER_ADMIN_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD || "Super@1212";

export function isValidSuperAdminLogin(email?: string, password?: string) {
  return (
    String(email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() &&
    String(password || "") === SUPER_ADMIN_PASSWORD
  );
}
