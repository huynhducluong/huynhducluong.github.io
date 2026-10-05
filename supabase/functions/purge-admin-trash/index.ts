import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const purgeSecret = Deno.env.get("ADMIN_TRASH_PURGE_SECRET");
const storageBucket = Deno.env.get("PORTFOLIO_STORAGE_BUCKET") ?? "portfolio-public";

if (!supabaseUrl || !serviceRoleKey || !purgeSecret) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and ADMIN_TRASH_PURGE_SECRET are required.",
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ExpiredItem {
  id: string;
}

interface StoredMedia {
  id: string;
  storage_path: string;
}

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const details = error as Record<string, unknown>;
    return [details.message, details.details, details.hint, details.code]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" | ") || "Unknown Supabase error";
  }
  return String(error);
};

const purgeRows = async (
  table: "projects" | "automation_tools",
  relation: "project_images" | "tool_images",
): Promise<{ deleted: number; failures: string[] }> => {
  const { data, error } = await admin
    .from(table)
    .select("id")
    .not("deleted_at", "is", null)
    .lte("purge_after", new Date().toISOString())
    .limit(100);

  if (error) {
    const failure = `Cannot load expired ${table}: ${errorMessage(error)}`;
    console.error(failure);
    return { deleted: 0, failures: [failure] };
  }

  let deleted = 0;
  const failures: string[] = [];
  for (const item of (data ?? []) as unknown as ExpiredItem[]) {
    try {
      const ownerColumn = relation === "project_images" ? "project_id" : "tool_id";
      const { data: mediaData, error: mediaError } = await admin
        .from(relation)
        .select("id, storage_path")
        .eq(ownerColumn, item.id);
      if (mediaError) throw new Error(`Cannot load ${relation}: ${errorMessage(mediaError)}`);

      const media = (mediaData ?? []) as StoredMedia[];
      const paths = media.map((image) => image.storage_path);
      if (relation === "project_images" && media.length) {
        const { data: cropData, error: cropError } = await admin
          .from("project_image_crops")
          .select("storage_path")
          .in("project_image_id", media.map((image) => image.id));
        if (cropError) throw new Error(`Cannot load project image crops: ${errorMessage(cropError)}`);
        paths.push(...(cropData ?? []).map((crop) => crop.storage_path));
      }

      const uniquePaths = [...new Set(paths.filter(Boolean))];
      if (uniquePaths.length) {
        const referenceChecks = await Promise.all(uniquePaths.map(async (path) => {
          const { data: referenced, error: referenceError } = await admin.rpc("release_references_storage_path", { target_path: path });
          if (referenceError) throw new Error(`Cannot check release references: ${errorMessage(referenceError)}`);
          return { path, referenced: Boolean(referenced) };
        }));
        const removablePaths = referenceChecks.filter((item) => !item.referenced).map((item) => item.path);
        const { error: storageError } = removablePaths.length
          ? await admin.storage.from(storageBucket).remove(removablePaths)
          : { error: null };
        if (storageError) throw storageError;
      }
      const { error: deleteError } = await admin.from(table).delete().eq("id", item.id).not("deleted_at", "is", null);
      if (deleteError) throw deleteError;
      deleted += 1;
    } catch (error) {
      const failure = `${table}/${item.id}: ${errorMessage(error)}`;
      console.error(failure);
      failures.push(failure);
    }
  }

  return { deleted, failures };
};

Deno.serve(async (request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (request.headers.get("x-admin-purge-secret") !== purgeSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (request.method === "GET") {
    const cutoff = new Date().toISOString();
    const [projects, tools] = await Promise.all([
      admin.from("projects").select("id").not("deleted_at", "is", null).lte("purge_after", cutoff).limit(1),
      admin.from("automation_tools").select("id").not("deleted_at", "is", null).lte("purge_after", cutoff).limit(1),
    ]);
    const checks = {
      projects: projects.error ? errorMessage(projects.error) : "ok",
      tools: tools.error ? errorMessage(tools.error) : "ok",
    };
    return Response.json({
      ok: !projects.error && !tools.error,
      function: "purge-admin-trash",
      checks,
    });
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
    const message = errorMessage(error);
    console.error("purge-admin-trash failed", message);
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
});
