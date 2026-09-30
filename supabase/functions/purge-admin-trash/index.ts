import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const storageBucket = Deno.env.get("PORTFOLIO_STORAGE_BUCKET") ?? "portfolio-public";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ExpiredItem {
  id: string;
  project_images?: Array<{ storage_path: string }>;
  tool_images?: Array<{ storage_path: string }>;
}

const purgeRows = async (
  table: "projects" | "automation_tools",
  relation: "project_images" | "tool_images",
): Promise<{ deleted: number; failures: string[] }> => {
  const { data, error } = await admin
    .from(table)
    .select(`id, ${relation}(storage_path)`)
    .not("deleted_at", "is", null)
    .lte("purge_after", new Date().toISOString())
    .limit(100);

  if (error) throw error;

  let deleted = 0;
  const failures: string[] = [];
  for (const item of (data ?? []) as unknown as ExpiredItem[]) {
    try {
      const images = relation === "project_images" ? item.project_images ?? [] : item.tool_images ?? [];
      const paths = images.map((image) => image.storage_path);
      if (paths.length) {
        const { error: storageError } = await admin.storage.from(storageBucket).remove(paths);
        if (storageError) throw storageError;
      }
      const { error: deleteError } = await admin.from(table).delete().eq("id", item.id).not("deleted_at", "is", null);
      if (deleteError) throw deleteError;
      deleted += 1;
    } catch (error) {
      failures.push(`${table}/${item.id}: ${error instanceof Error ? error.message : "Unknown purge error"}`);
    }
  }

  return { deleted, failures };
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (request.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const [projects, tools] = await Promise.all([
      purgeRows("projects", "project_images"),
      purgeRows("automation_tools", "tool_images"),
    ]);
    const failures = [...projects.failures, ...tools.failures];
    return Response.json(
      { deleted: { projects: projects.deleted, tools: tools.deleted }, failures },
      { status: failures.length ? 207 : 200 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Trash purge failed." },
      { status: 500 },
    );
  }
});
