import { redirect } from "next/navigation";

export default function SuperAdminRootPage() {
  redirect("/auth/super-admin/login");
}
