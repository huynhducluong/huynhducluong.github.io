import { supabaseConfig } from "../config/supabase";
import type { ProfilePhotoAsset } from "../types/profilePhoto";
import { supabase } from "./supabaseClient";

interface ProfilePhotoRow {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  width: number;
  height: number;
  file_size: number;
  created_at: string;
}

const profilePhotoFromRow = (row: ProfilePhotoRow): ProfilePhotoAsset => ({
  id: row.id,
  name: row.name,
  storagePath: row.storage_path,
  publicUrl: supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(row.storage_path).data.publicUrl,
  mimeType: row.mime_type,
  width: row.width,
  height: row.height,
  fileSize: row.file_size,
  createdAt: row.created_at,
});

export const listProfilePhotos = async (): Promise<ProfilePhotoAsset[]> => {
  const { data, error } = await supabase
    .from("profile_photos")
    .select("id,name,storage_path,mime_type,width,height,file_size,created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProfilePhotoRow[]).map(profilePhotoFromRow);
};

export const createProfilePhoto = async (name: string, file: Blob): Promise<ProfilePhotoAsset> => {
  const id = crypto.randomUUID();
  const storagePath = `profile-photos/${id}.webp`;
  const mimeType = file.type || "image/webp";
  const { error: uploadError } = await supabase.storage
    .from(supabaseConfig.storageBucket)
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const row = {
    id,
    name: name.trim(),
    storage_path: storagePath,
    mime_type: mimeType,
    width: 1024,
    height: 1024,
    file_size: file.size,
  };
  const { data, error: metadataError } = await supabase
    .from("profile_photos")
    .insert(row)
    .select("id,name,storage_path,mime_type,width,height,file_size,created_at")
    .single();
  if (metadataError) {
    await supabase.storage.from(supabaseConfig.storageBucket).remove([storagePath]);
    throw metadataError;
  }
  return profilePhotoFromRow(data as ProfilePhotoRow);
};

export const archiveProfilePhoto = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("profile_photos")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);
  if (error) throw error;
};

export const renameProfilePhoto = async (id: string, name: string): Promise<ProfilePhotoAsset> => {
  const { data, error } = await supabase
    .from("profile_photos")
    .update({ name: name.trim() })
    .eq("id", id)
    .is("archived_at", null)
    .select("id,name,storage_path,mime_type,width,height,file_size,created_at")
    .single();
  if (error) throw error;
  return profilePhotoFromRow(data as ProfilePhotoRow);
};
