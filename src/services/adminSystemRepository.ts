import { supabaseConfig } from "../config/supabase";
import { supabase } from "./supabaseClient";

export interface AdminSchemaHealth {
  healthy: boolean;
  version: string;
  message: string;
  checks: {
    transactionalPublishing: boolean;
    releaseAwareMedia: boolean;
    contentReadiness: boolean;
    purgeServiceRole: boolean;
    trashPurgeSchedule: boolean;
    credentialStorage: boolean;
  };
  trashPurge: {
    scheduled: boolean;
    active: boolean;
    schedule: string | null;
    timezone: string;
    localTime: string;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastRunMessage: string | null;
  };
}

const EXPECTED_ADMIN_SCHEMA_VERSION = "202610060002";
const emptyChecks: AdminSchemaHealth["checks"] = {
  transactionalPublishing: false,
  releaseAwareMedia: false,
  contentReadiness: false,
  purgeServiceRole: false,
  trashPurgeSchedule: false,
  credentialStorage: false,
};
const emptyTrashPurge: AdminSchemaHealth["trashPurge"] = {
  scheduled: false,
  active: false,
  schedule: null,
  timezone: "UTC",
  localTime: "02:15 Asia/Bangkok",
  lastRunAt: null,
  lastRunStatus: null,
  lastRunMessage: null,
};

type AdminSchemaHealthPayload = Partial<Omit<AdminSchemaHealth, "message">>;

export const parseAdminSchemaHealth = (payload: unknown): AdminSchemaHealth => {
  const value = payload && typeof payload === "object" ? payload as AdminSchemaHealthPayload : {};
  const version = typeof value.version === "string" ? value.version : "unknown";
  const checks = { ...emptyChecks, ...(value.checks ?? {}) };
  const trashPurge = { ...emptyTrashPurge, ...(value.trashPurge ?? {}) };
  const requiredChecks = Object.values(checks).every(Boolean);
  const healthy = value.healthy === true && version >= EXPECTED_ADMIN_SCHEMA_VERSION && requiredChecks;
  const failedChecks = [
    !checks.purgeServiceRole ? "purge database access" : "",
    !checks.trashPurgeSchedule ? "daily Trash schedule" : "",
    !checks.credentialStorage ? "private credential storage" : "",
  ].filter(Boolean);
  return {
    healthy,
    version,
    checks,
    trashPurge,
    message: healthy
      ? "Admin operations are healthy."
      : version < EXPECTED_ADMIN_SCHEMA_VERSION
        ? "Apply the latest Supabase migration to enable the Phase 4 operational checks."
        : failedChecks.length
        ? `Admin operations need attention: ${failedChecks.join(" and ")}.`
        : "Admin operational health could not be verified.",
  };
};

export const loadAdminSchemaHealth = async (): Promise<AdminSchemaHealth> => {
  const { data, error } = await supabase.rpc("admin_schema_health");
  if (error) {
    return parseAdminSchemaHealth(null);
  }
  return parseAdminSchemaHealth(data);
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
