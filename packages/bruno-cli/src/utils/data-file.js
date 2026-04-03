const fs = require('fs');
const path = require('path');

/**
 * Parses a CSV string into an array of objects.
 * Compliant with RFC 4180: supports quoted fields, embedded commas, and embedded newlines.
 *
 * @param {string} content - Raw CSV string
 * @returns {object[]} Array of row objects keyed by header names
 */
const parseCSV = (content) => {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const parseFields = (line, startPos) => {
    const fields = [];
    let pos = startPos;

    while (pos <= line.length) {
      if (line[pos] === '"') {
        // Quoted field
        let field = '';
        let closed = false;
        pos++; // skip opening quote
        while (pos < line.length) {
          if (line[pos] === '"') {
            if (line[pos + 1] === '"') {
              // Escaped quote
              field += '"';
              pos += 2;
            } else {
              pos++; // skip closing quote
              closed = true;
              break;
            }
          } else {
            field += line[pos];
            pos++;
          }
        }
        if (!closed) {
          throw new Error(`Malformed CSV: unterminated quoted field starting near "${field.slice(0, 20)}"`);
        }
        if (pos < line.length && line[pos] !== ',') {
          throw new Error(`Malformed CSV: unexpected character '${line[pos]}' after closing quote`);
        }
        fields.push(field);
        // skip comma, or stop if we reached the end of the line
        if (pos >= line.length) break;
        if (line[pos] === ',') pos++;
      } else {
        // Unquoted field
        const commaIdx = line.indexOf(',', pos);
        if (commaIdx === -1) {
          fields.push(line.slice(pos));
          pos = line.length + 1;
        } else {
          fields.push(line.slice(pos, commaIdx));
          pos = commaIdx + 1;
        }
      }
    }

    return fields;
  };

  // Split while respecting quoted newlines.
  // Only enters quoted mode when '"' starts a field (after comma or at line start),
  // matching the behaviour of parseFields() so mid-field quotes never absorb the next line.
  const splitLines = (text) => {
    const lines = [];
    let current = '';
    let inQuotes = false;
    let atFieldStart = true;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes) {
          if (text[i + 1] === '"') {
            // Escaped quote inside a quoted field
            current += '""';
            i++;
          } else {
            // Closing quote
            inQuotes = false;
            current += ch;
            atFieldStart = false;
          }
        } else if (atFieldStart) {
          // Opening quote — only valid at field boundary
          inQuotes = true;
          current += ch;
          atFieldStart = false;
        } else {
          // Mid-field quote in an unquoted field — treat as literal
          current += ch;
        }
      } else if (ch === '\n' && !inQuotes) {
        lines.push(current);
        current = '';
        atFieldStart = true;
      } else {
        if (ch === ',') {
          atFieldStart = true;
        } else {
          atFieldStart = false;
        }
        current += ch;
      }
    }

    if (current.length > 0) {
      lines.push(current);
    }

    return lines;
  };

  const lines = splitLines(normalized).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseFields(lines[0], 0).map((h) => h.trim());

  if (headers.length === 0) {
    return [];
  }

  const seenHeaders = new Set();
  headers.forEach((header, idx) => {
    if (!header) {
      throw new Error(`Malformed CSV: header at column ${idx + 1} is empty.`);
    }
    if (seenHeaders.has(header)) {
      throw new Error(`Malformed CSV: duplicate header "${header}".`);
    }
    seenHeaders.add(header);
  });

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseFields(lines[i], 0);
    if (values.length > headers.length) {
      throw new Error(
        `Malformed CSV: row ${i + 1} has ${values.length} columns but the header has only ${headers.length}.`
      );
    }
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }

  return rows;
};

/**
 * Parses a JSON file into an array of objects.
 *
 * @param {string} content - Raw JSON string
 * @returns {object[]} Array of row objects
 */
const parseJSON = (content) => {
  // Strip UTF-8 BOM (U+FEFF) if present — some editors prepend it and JSON.parse rejects it
  const normalized = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  let data;
  try {
    data = JSON.parse(normalized);
  } catch (err) {
    throw new Error(`Failed to parse JSON data file: ${err.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON data file must contain an array of objects at the top level.');
  }

  if (!data.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row))) {
    throw new Error('JSON data file must contain only plain objects (no nulls, arrays, or primitives).');
  }

  return data;
};

/**
 * Reads and parses an iteration data file (CSV or JSON).
 *
 * @param {string} filePath - Absolute path to the data file
 * @returns {object[]} Array of row objects, one per iteration
 */
const parseDataFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let content;

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Could not read data file "${filePath}": ${err.message}`);
  }

  if (ext === '.csv') {
    return parseCSV(content);
  }

  if (ext === '.json') {
    return parseJSON(content);
  }

  throw new Error(`Unsupported data file format "${ext}". Supported formats: .csv, .json`);
};

module.exports = { parseDataFile, parseCSV, parseJSON };
