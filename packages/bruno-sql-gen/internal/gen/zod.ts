import type { StatementParam } from "../types";

function baseExpr(type: string): string {
  switch (type) {
    case "number":
      return "z.number()";
    case "string":
      return "z.string()";
    case "bigint":
      return "z.bigint()";
    case "boolean":
      return "z.boolean().transform((value) => (value ? 1 : 0))";
    case "date":
      return 'z.union([z.number(), z.date(), z.string().datetime()]).transform((value) => (value instanceof Date ? value.getTime() : typeof value === "string" ? Date.parse(value) : value))';
    case "json":
      return "z.unknown().transform((value) => JSON.stringify(value))";
    default:
      return "z.unknown()";
  }
}

export function zodExpr(param: StatementParam): string {
  const base =
    param.enumValues && param.enumValues.length
      ? `z.enum([${param.enumValues.map((value) => JSON.stringify(value)).join(", ")}])`
      : baseExpr(param.type);
  return param.notNull ? base : `${base}.nullable()`;
}
