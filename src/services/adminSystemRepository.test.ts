import { describe, expect, it } from "vitest";
import { parseAdminSchemaHealth } from "./adminSystemRepository";

describe("Admin operational health", () => {
  it("accepts the current schema only when every required check passes", () => {
    const health = parseAdminSchemaHealth({
      version: "202610060002",
      healthy: true,
      checks: {
        transactionalPublishing: true,
        releaseAwareMedia: true,
        contentReadiness: true,
        purgeServiceRole: true,
        trashPurgeSchedule: true,
        credentialStorage: true,
      },
      trashPurge: { scheduled: true, active: true, schedule: "15 19 * * *", lastRunStatus: "succeeded" },
    });
    expect(health.healthy).toBe(true);
    expect(health.message).toBe("Admin operations are healthy.");
  });

  it("requests the Phase 4 migration for an older response", () => {
    const health = parseAdminSchemaHealth({ version: "202610050003", healthy: true });
    expect(health.healthy).toBe(false);
    expect(health.message).toContain("latest Supabase migration");
  });

  it("identifies a broken purge schedule", () => {
    const health = parseAdminSchemaHealth({
      version: "202610060002",
      healthy: false,
      checks: {
        transactionalPublishing: true,
        releaseAwareMedia: true,
        contentReadiness: true,
        purgeServiceRole: true,
        trashPurgeSchedule: false,
        credentialStorage: true,
      },
    });
    expect(health.message).toContain("daily Trash schedule");
  });
});
