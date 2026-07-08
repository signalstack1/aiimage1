import { Redirect } from "wouter";
import { APP_CONFIG } from "@/config/app";

/** Requires admin login. Redirects to /admin/login if no token. */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = sessionStorage.getItem("admin_token");
  if (!token) return <Redirect to="/admin/login" />;
  return <>{children}</>;
}

/**
 * Requires admin login AND the named module to be enabled in APP_CONFIG.adminModules.
 * Redirects to /admin/login if not logged in, or /admin if the module is disabled.
 */
export function ModuleRoute({
  module: moduleName,
  children,
}: {
  module: string;
  children: React.ReactNode;
}) {
  const token = sessionStorage.getItem("admin_token");
  if (!token) return <Redirect to="/admin/login" />;
  if (APP_CONFIG.adminModules[moduleName] === false) return <Redirect to="/admin" />;
  return <>{children}</>;
}
