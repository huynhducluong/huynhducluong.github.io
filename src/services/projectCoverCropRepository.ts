import { supabaseConfig } from "../config/supabase";
import type { PortfolioLayout } from "../types/portfolio";
import { supabase } from "./supabaseClient";

export interface ProjectImageCropRow {
  id: string;
  project_image_id: string;
  layout: PortfolioLayout;
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

export interface ProjectCoverCropOutput {
  layout: PortfolioLayout;
  blob: Blob;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  width: number;
  height: number;
}

export const downloadStoredMedia = async (storagePath: string): Promise<Blob> => {
  const { data, error } = await supabase.storage.from(supabaseConfig.storageBucket).download(storagePath);
  if (error) throw error;
  return data;
};

export const saveProjectCoverCrops = async (
  projectId: string,
  imageId: string,
  outputs: ProjectCoverCropOutput[],
): Promise<ProjectImageCropRow[]> => {
  const uploadedPaths: string[] = [];
  try {
    const rows = [];
    for (const output of outputs) {
      const storagePath = `project-cover-crops/${projectId}/${imageId}/${output.layout}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from(supabaseConfig.storageBucket)
        .upload(storagePath, output.blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      uploadedPaths.push(storagePath);
      rows.push({
        project_image_id: imageId,
        layout: output.layout,
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

    const { data, error } = await supabase
      .from("project_image_crops")
      .upsert(rows, { onConflict: "project_image_id,layout" })
      .select("id,project_image_id,layout,storage_path,crop_x,crop_y,crop_width,crop_height,width,height,mime_type,file_size");
    if (error) throw error;
    return data as ProjectImageCropRow[];
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(supabaseConfig.storageBucket).remove(uploadedPaths);
    throw error;
  }
};
