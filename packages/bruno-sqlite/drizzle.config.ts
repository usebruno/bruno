import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./.generated/migrations",
  schema: "./src/schema",
  dialect: "sqlite",
});
