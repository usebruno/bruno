export default {
  statements: "./src/statements",
  migrations: "./.generated/migrations",
  out: [
    { dir: "./generated/node", target: "node" as const },
    { dir: "./generated/web", target: "web" as const }
  ]
};
