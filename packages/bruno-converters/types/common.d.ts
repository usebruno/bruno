export declare const uuid: () => string;
export declare const normalizeFileName: (name: string) => string;
export declare const validateSchema: (collection?: {}) => Promise<unknown>;
export declare const updateUidsInCollection: (_collection: any) => any;
export declare const transformItemsInCollection: (collection: any) => any;
export declare const hydrateSeqInCollection: (collection: any) => any;
