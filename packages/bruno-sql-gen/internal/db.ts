import { drizzle } from "drizzle-orm/sqlite-proxy";
export const db = drizzle(async () => ({ rows: [] }));
