import { z } from "zod";
import type { GeneratedStatement } from "./types";

export const statements: Record<string, GeneratedStatement> = {};

export type StatementName = string;
