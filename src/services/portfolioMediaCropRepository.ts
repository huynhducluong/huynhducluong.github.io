import { supabaseConfig } from "../config/supabase";
import type { MediaCropProfile } from "../types/portfolio";
import { removeUnreferencedStoragePaths } from "./adminSystemRepository";
import { downloadStoredMedia } from "./projectCoverCropRepository";
import { supabase } from "./supabaseClient";

export { downloadStoredMedia };

export type PortfolioMediaOwnerType = "project" | "tool";

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
  : { table: "tool_media_crops", foreignKey: "tool_image_id", folder: "tools" };

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
