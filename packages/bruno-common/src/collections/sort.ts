export const COLLECTION_SORT_ORDERS = ['default', 'alphabetical', 'reverseAlphabetical'] as const;
export type CollectionSortOrder = (typeof COLLECTION_SORT_ORDERS)[number];
