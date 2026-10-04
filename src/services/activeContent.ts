export interface SoftDeletedRecord {
  deleted_at?: string | null;
}

export const withoutTrashed = <Row extends SoftDeletedRecord>(
  rows: readonly Row[] | null | undefined,
): Row[] => (rows ?? []).filter((row) => row.deleted_at == null);
