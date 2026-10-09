export interface ContentOrderItem {
  id: string;
}

export type ContentOrderSelector<T> = (item: T) => number;

const normalizedOrder = (value: number): number =>
  Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;

export const compareMasterContentOrder = <T extends ContentOrderItem>(
  left: T,
  right: T,
  orderOf: ContentOrderSelector<T>,
): number =>
  normalizedOrder(orderOf(left)) - normalizedOrder(orderOf(right))
  || left.id.localeCompare(right.id);

export const sortByMasterContentOrder = <T extends ContentOrderItem>(
  items: readonly T[],
  orderOf: ContentOrderSelector<T>,
): T[] => [...items].sort((left, right) => compareMasterContentOrder(left, right, orderOf));
