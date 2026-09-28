import { supabase } from "../services/supabaseClient";

export type AdminAccess = "allowed" | "forbidden" | "signed-out";

const baseUrl = import.meta.env.BASE_URL;
const adminRoot = `${baseUrl}admin/`;
const protectedRoots = [`${baseUrl}admin/`, `${baseUrl}cover-letter/`];

const isProtectedPath = (pathname: string): boolean =>
  protectedRoots.some((root) => pathname === root || pathname.startsWith(root));

export const currentRelativeUrl = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

export const safeReturnTo = (value = new URLSearchParams(window.location.search).get("returnTo")): string | null => {
  if (!value) return null;

  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin || !isProtectedPath(target.pathname)) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
};

export const adminLoginUrl = (returnTo = currentRelativeUrl()): string => {
  const login = new URL(adminRoot, window.location.origin);
  const safeTarget = safeReturnTo(returnTo);
  if (safeTarget && safeTarget !== adminRoot) login.searchParams.set("returnTo", safeTarget);
  return `${login.pathname}${login.search}`;
};

export const magicLinkRedirectUrl = (): string => {
  const redirect = new URL(adminRoot, window.location.origin);
  const returnTo = safeReturnTo();
  if (returnTo) redirect.searchParams.set("returnTo", returnTo);
  return redirect.toString();
};

export const getAdminAccess = async (): Promise<AdminAccess> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return "signed-out";

  const { data, error } = await supabase.rpc("is_portfolio_admin");
  return !error && data === true ? "allowed" : "forbidden";
};

export const requireAdminAccess = async (): Promise<boolean> => {
  const access = await getAdminAccess();
  if (access === "allowed") return true;
  if (access === "forbidden") await supabase.auth.signOut();
  window.location.replace(adminLoginUrl());
  return false;
};
