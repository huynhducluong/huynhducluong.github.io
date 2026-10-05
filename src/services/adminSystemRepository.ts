import { supabaseConfig } from "../config/supabase";
import { supabase } from "./supabaseClient";

export interface AdminSchemaHealth {
  healthy: boolean;
  version: string;
  message: string;
}

export const loadAdminSchemaHealth = async (): Promise<AdminSchemaHealth> => {
  const { data, error } = await supabase.rpc("admin_schema_health");
  if (error) {
    return {
      healthy: false,
      version: "unknown",
      message: "Apply the latest Supabase migration to enable transactional publishing and protected media cleanup.",
    };
  }
  const value = data as { version?: string } | null;
  const version = value?.version ?? "unknown";
  const healthy = version !== "unknown" && version >= "202610050003";
  return {
    healthy,
    version,
    message: healthy ? "Database schema is current." : "Database schema is not current.",
  };
};

export const storagePathIsReferenced = async (storagePath: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("release_references_storage_path", { target_path: storagePath });
  if (error) throw error;
  return Boolean(data);
};

export const removeUnreferencedStoragePaths = async (paths: string[]): Promise<{ removed: string[]; retained: string[] }> => {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const checks = await Promise.all(uniquePaths.map(async (path) => ({ path, referenced: await storagePathIsReferenced(path) })));
  const retained = checks.filter((item) => item.referenced).map((item) => item.path);
  const removable = checks.filter((item) => !item.referenced).map((item) => item.path);
  if (removable.length) {
    const { error } = await supabase.storage.from(supabaseConfig.storageBucket).remove(removable);
    if (error) throw error;
  }
  return { removed: removable, retained };
};
