// Data-driven runs: a CSV or JSON file supplies one row of variables per runner iteration.
// Shared by the app runner (bruno-electron) and `bru run` (bruno-cli), so both read files the same way.

export type T_IterationDataFormat = 'csv' | 'json';

export type T_IterationDataRow = Record<string, any>;

export const ITERATION_DATA_FORMATS: T_IterationDataFormat[] = ['csv', 'json'];

const BOM = '﻿';

export const getIterationDataFormat = (filePath: string): T_IterationDataFormat | null => {
  const extension = String(filePath || '').split('.').pop()?.toLowerCase();
  return ITERATION_DATA_FORMATS.includes(extension as T_IterationDataFormat)
    ? (extension as T_IterationDataFormat)
    : null;
};

// RFC 4180: comma-separated, fields optionally wrapped in double quotes, a doubled quote ("")
// inside a quoted field is a literal quote, and quoted fields may span lines.
const parseCsvRecords = (content: string): { fields: string[]; line: number }[] => {
  const records: { fields: string[]; line: number }[] = [];
  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldWasQuoted = false;
  let line = 1;
  let recordStartLine = 1;

  const endField = () => {
    fields.push(field);
    field = '';
    fieldWasQuoted = false;
  };

  const endRecord = () => {
    endField();
    // a blank line is a single empty, unquoted field — skip it rather than treat it as a row
    const isBlank = fields.length === 1 && fields[0] === '';
    if (!isBlank) {
      records.push({ fields, line: recordStartLine });
    }
    fields = [];
  };

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') line++;
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.length > 0 || fieldWasQuoted) {
        throw new Error(`Invalid CSV at line ${line}: unexpected quote inside an unquoted field`);
      }
      inQuotes = true;
      fieldWasQuoted = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && content[i + 1] === '\n') i++;
      endRecord();
      line++;
      recordStartLine = line;
    } else {
      if (fieldWasQuoted) {
        throw new Error(`Invalid CSV at line ${line}: unexpected character after a closing quote`);
      }
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error(`Invalid CSV: unterminated quoted field starting at line ${recordStartLine}`);
  }
  if (field.length > 0 || fieldWasQuoted || fields.length > 0) {
    endRecord();
  }

  return records;
};

const parseCsv = (content: string): T_IterationDataRow[] => {
  const [header, ...records] = parseCsvRecords(content);
  if (!header) {
    return [];
  }

  const columns = header.fields.map((name) => name.trim());
  const seen = new Set<string>();
  columns.forEach((name, index) => {
    if (!name) {
      throw new Error(`Invalid CSV header: column ${index + 1} has no name`);
    }
    if (seen.has(name)) {
      throw new Error(`Invalid CSV header: duplicate column "${name}"`);
    }
    seen.add(name);
  });

  return records.map(({ fields, line }) => {
    if (fields.length !== columns.length) {
      throw new Error(`Invalid CSV at line ${line}: expected ${columns.length} fields but found ${fields.length}`);
    }
    const row: T_IterationDataRow = {};
    columns.forEach((name, index) => {
      row[name] = fields[index];
    });
    return row;
  });
};

const parseJson = (content: string): T_IterationDataRow[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`Invalid JSON: ${err?.message || err}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid JSON data file: expected an array of objects, e.g. [{ "name": "value" }]');
  }

  parsed.forEach((row, index) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Invalid JSON data file: item ${index + 1} is not an object`);
    }
  });

  return parsed as T_IterationDataRow[];
};

export const parseIterationData = (content: string, format: T_IterationDataFormat): T_IterationDataRow[] => {
  const text = String(content ?? '');
  const withoutBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;

  if (format === 'csv') {
    return parseCsv(withoutBom);
  }
  if (format === 'json') {
    return parseJson(withoutBom);
  }
  throw new Error(`Unsupported data file format "${format}". Use a .csv or .json file.`);
};

/**
 * Number of iterations to run. An explicit count wins; otherwise one iteration per data row,
 * or a single iteration when there is no data file.
 */
export const getIterationCount = ({ rowCount = 0, iterations }: { rowCount?: number; iterations?: number | null }): number => {
  if (iterations !== undefined && iterations !== null) {
    if (!Number.isInteger(iterations) || iterations < 1) {
      throw new Error(`Iterations must be a positive whole number, received "${iterations}"`);
    }
    return iterations;
  }
  return rowCount > 0 ? rowCount : 1;
};

/**
 * Row for a 0-based iteration. When there are more iterations than rows the last row is reused
 * (same as Postman's collection runner).
 */
export const getIterationRow = (rows: T_IterationDataRow[] | null | undefined, iterationIndex: number): T_IterationDataRow => {
  if (!rows || rows.length === 0) {
    return {};
  }
  return rows[Math.min(iterationIndex, rows.length - 1)];
};
