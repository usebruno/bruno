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
        // skip comma
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

  // Split while respecting quoted newlines
  const splitLines = (text) => {
    const lines = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '""';
          i++;
        } else {
          inQuotes = !inQuotes;
          current += ch;
        }
      } else if (ch === '\n' && !inQuotes) {
        lines.push(current);
        current = '';
      } else {
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

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseFields(lines[i], 0);
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
  let data;
  try {
    data = JSON.parse(content);
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
