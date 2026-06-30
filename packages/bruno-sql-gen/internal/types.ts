export type StatementKind = "read" | "write";

export interface StatementParam {
  name: string;
  type: string;
  notNull: boolean;
  enumValues?: string[];
}

export interface Migration {
  idx: number;
  tag: string;
  hash: string;
  statements: string[];
}

export interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints?: boolean;
}

export interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}
