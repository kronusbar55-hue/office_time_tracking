import { cookies } from "next/headers";
import { verifyAuthToken } from "./auth";

export async function getServerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  return verifyAuthToken(token);
}
