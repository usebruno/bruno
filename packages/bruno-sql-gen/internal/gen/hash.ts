import { createHash } from "node:crypto";

export function hashContent(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return `sha256-${createHash("sha256").update(normalized, "utf8").digest("hex")}`;
}
