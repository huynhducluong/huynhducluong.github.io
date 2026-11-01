import { supabaseConfig } from "../config/supabase";
import type { MediaCropProfile } from "../types/portfolio";
import { removeUnreferencedStoragePaths } from "./adminSystemRepository";
import { downloadStoredMedia } from "./projectCoverCropRepository";
import { supabase } from "./supabaseClient";

export { downloadStoredMedia };

/** "credential" crops are public previews of private evidence images (credential_media_crops). */
export type PortfolioMediaOwnerType = "project" | "tool" | "credential";

export interface PortfolioMediaCropRow {
  id: string;
  profile: MediaCropProfile;
  storage_path: string;
  crop_x: number;
  crop_y: number;
  crop_width: number;
  crop_height: number;
  width: number;
  height: number;
  mime_type: string;
  file_size: number;
}

export interface PortfolioMediaCropOutput {
  profile: MediaCropProfile;
  blob: Blob;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  width: number;
  height: number;
}

const cropStorage = (ownerType: PortfolioMediaOwnerType) => ownerType === "project"
  ? { table: "project_media_crops", foreignKey: "project_image_id", folder: "projects" }
  : ownerType === "tool"
    ? { table: "tool_media_crops", foreignKey: "tool_image_id", folder: "tools" }
    : { table: "credential_media_crops", foreignKey: "credential_asset_id", folder: "credentials" };

export const savePortfolioMediaCrops = async (
  ownerType: PortfolioMediaOwnerType,
  ownerId: string,
  imageId: string,
  outputs: PortfolioMediaCropOutput[],
  removedProfiles: MediaCropProfile[] = [],
): Promise<void> => {
  const config = cropStorage(ownerType);
  const changedProfiles = [...new Set([...outputs.map((output) => output.profile), ...removedProfiles])];
  if (!changedProfiles.length) return;

  const { data: existing, error: existingError } = await supabase
    .from(config.table)
    .select("profile,storage_path")
    .eq(config.foreignKey, imageId)
    .in("profile", changedProfiles);
  if (existingError) throw existingError;

  const uploadedPaths: string[] = [];
  try {
    const rows: Array<Record<string, unknown>> = [];
    for (const output of outputs) {
      const storagePath = `portfolio-media-crops/${config.folder}/${ownerId}/${imageId}/${output.profile}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from(supabaseConfig.storageBucket)
        .upload(storagePath, output.blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      uploadedPaths.push(storagePath);
      rows.push({
        [config.foreignKey]: imageId,
        profile: output.profile,
        storage_path: storagePath,
        crop_x: output.cropX,
        crop_y: output.cropY,
        crop_width: output.cropWidth,
        crop_height: output.cropHeight,
        width: output.width,
        height: output.height,
        mime_type: "image/webp",
        file_size: output.blob.size,
      });
    }

    if (rows.length) {
      const { error } = await supabase
        .from(config.table)
        .upsert(rows, { onConflict: `${config.foreignKey},profile` });
      if (error) throw error;
    }
    if (removedProfiles.length) {
      const { error } = await supabase
        .from(config.table)
        .delete()
        .eq(config.foreignKey, imageId)
        .in("profile", removedProfiles);
      if (error) throw error;
    }

    const replacementPaths = (existing ?? [])
      .map((row) => String(row.storage_path))
      .filter((path) => !uploadedPaths.includes(path));
    if (replacementPaths.length) {
      try {
        await removeUnreferencedStoragePaths(replacementPaths);
      } catch {
        // New rows are already valid; old files can be removed by a later cleanup pass.
      }
    }
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(supabaseConfig.storageBucket).remove(uploadedPaths);
    throw error;
  }
};

// Only Project and Tool originals are rotated in place; credential evidence is never rewritten (preview_rotation instead).
const mediaTable = (ownerType: PortfolioMediaOwnerType): "project_images" | "tool_images" => {
  if (ownerType === "credential") throw new Error("Credential evidence is never rewritten; store its preview rotation instead.");
  return ownerType === "project" ? "project_images" : "tool_images";
};
const extensionFor = (mimeType: string): string => mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";

/**
 * Step 1 of a rotation: uploads the rotated original beside the current one. Nothing references it yet, so a failure
 * later in the save leaves the image exactly as it was (call discardRotatedOriginal).
 */
export const uploadRotatedOriginal = async (currentPath: string, blob: Blob): Promise<string> => {
  const folder = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "media";
  const storagePath = `${folder}/${crypto.randomUUID()}.${extensionFor(blob.type)}`;
  const { error } = await supabase.storage.from(supabaseConfig.storageBucket).upload(storagePath, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return storagePath;
};

export const discardRotatedOriginal = async (storagePath: string): Promise<void> => {
  await supabase.storage.from(supabaseConfig.storageBucket).remove([storagePath]);
};

/**
 * Step 2, after the crops of the rotated image are saved: points the image row at the rotated original, then removes
 * the old file unless a published release still references it (release_references_storage_path).
 */
export const commitRotatedOriginal = async (ownerType: PortfolioMediaOwnerType, imageId: string, previousPath: string, storagePath: string, blob: Blob): Promise<void> => {
  const { error } = await supabase.from(mediaTable(ownerType)).update({ storage_path: storagePath, mime_type: blob.type, file_size: blob.size }).eq("id", imageId);
  if (error) throw error;
  try {
    await removeUnreferencedStoragePaths([previousPath]);
  } catch {
    // The row already points at the rotated file; an orphaned original is removed by a later cleanup pass.
  }
};
