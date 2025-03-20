/**
 * Credits to
 * - https://github.com/zaach/jsonlint/blob/master/lib/formatter.js
 *   which is again copied from
 * - https://github.com/umbrae/jsonlintdotcom/blob/master/c/js/jsl.format.js
 *   both under MIT license.
 **/


/**
 * Provide json reformatting in a character-by-character approach, so that even invalid JSON may be reformatted (to the best of its ability).
 *
 **/
export default function(json, indentChars) {
  var i = 0,
    il = 0,
    tab = typeof indentChars !== 'undefined' ? indentChars : '  ',
    newJson = '',
    indentLevel = 0,
    inString = false,
    currentChar = null;

  for (i = 0, il = json.length; i < il; i += 1) {
    currentChar = json.charAt(i);

    switch (currentChar) {
      case '{':
      case '[':
        if (!inString) {
          newJson += currentChar + '\n' + repeat(tab, indentLevel + 1);
          indentLevel += 1;
        } else {
          newJson += currentChar;
        }
        break;
      case '}':
      case ']':
        if (!inString) {
          indentLevel -= 1;
          newJson += '\n' + repeat(tab, indentLevel) + currentChar;
        } else {
          newJson += currentChar;
        }
        break;
      case ',':
        if (!inString) {
          newJson += ',\n' + repeat(tab, indentLevel);
        } else {
          newJson += currentChar;
        }
        break;
      case ':':
        if (!inString) {
          newJson += ': ';
        } else {
          newJson += currentChar;
        }
        break;
      case ' ':
      case '\n':
      case '\t':
        if (inString) {
          newJson += currentChar;
        }
        break;
      case '"':
        if (i > 0 && json.charAt(i - 1) !== '\\') {
          inString = !inString;
        }
        newJson += currentChar;
        break;
      default:
        newJson += currentChar;
        break;
    }
  }

  return newJson;
}

function repeat(s, count) {
  return new Array(count + 1).join(s);
}
