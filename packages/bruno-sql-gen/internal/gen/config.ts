import path from "node:path";

export type Target = "node" | "web";

export interface Config {
  cwd: string;
  generatorRoot: string;
  statementsDir: string;
  migrationsDir: string;
  journal: string;
  templatesDir: string;
  outTargets: Array<{ dir: string; target: Target }>;
}

export async function loadConfig(): Promise<Config> {
  const cwd = process.cwd();
  const generatorRoot = path.resolve(__dirname, "..", "..");
  const mod = require(path.join(cwd, "gen.config.ts"));
  const userConfig = mod.default ?? mod;
  const resolve = (target: string) => path.resolve(cwd, target);

  return {
    cwd,
    generatorRoot,
    statementsDir: resolve(userConfig.statements),
    migrationsDir: resolve(userConfig.migrations),
    journal: path.join(resolve(userConfig.migrations), "meta", "_journal.json"),
    templatesDir: path.join(generatorRoot, "internal", "templates"),
    outTargets: userConfig.out.map((entry: { dir: string; target: Target }) => ({
      dir: resolve(entry.dir),
      target: entry.target
    }))
  };
}
