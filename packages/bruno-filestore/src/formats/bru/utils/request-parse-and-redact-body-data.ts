/**
 * Parses a .bru file and extracts body content while redacting it from the main content
 * @param {string} bruFileContent - The raw content of the .bru file
 * @returns {Object} Object containing redacted file content and extracted body data
 */
export const bruRequestParseAndRedactBodyData = (bruFileContent: string) => {
  try {
    // Define the patterns that indicate the start of different body types
    const bodyTypePatterns = [
      "body:json {",
      "body:text {",
      "body:xml {",
      "body:sparql {",
      "body:graphql {"
    ];

    // Normalize line endings to LF
    bruFileContent = (bruFileContent || '').replace(/\r\n/g, '\n');

    const EOL = `\n`;

    /**
     * Removes the leading 2-space indentation from each line of a string
     * @param {string} indentedString - The string with leading spaces to remove
     * @returns {string} The string with indentation removed
     */
    const removeLeadingIndentation = (indentedString: string) => {
      if (!indentedString || !indentedString.length) {
        return indentedString || '';
      }

      return indentedString
        .split(EOL)
        .map((line) => line.replace(/^  /, ''))
        .join(EOL);
    };

    // Split the file content into blocks
    let fileContentBlocks = bruFileContent.split(`${EOL}}${EOL}`);
    fileContentBlocks = fileContentBlocks.filter(Boolean).map(_ => _.trim());

    // Extract body blocks and their content
    const extractedBodyBlocks = fileContentBlocks
      .filter(block => bodyTypePatterns.some(pattern => block.startsWith(pattern)))
      .reduce((bodyContentMap: Record<string, string>, bodyBlock) => {
        // Extract the body type (json, text, xml, etc.) from the first line
        const firstLine = bodyBlock.split(EOL)[0];
        const bodyType = firstLine.split(`body:`)[1].split(/\s/)[0];
        
        // Extract the body content (everything between the opening and closing braces)
        const bodyContentLines = bodyBlock.split(EOL).slice(1);
        const rawBodyContent = bodyContentLines.join(EOL);
        
        // Remove indentation from the body content
        const cleanBodyContent = removeLeadingIndentation(rawBodyContent);
        
        bodyContentMap[bodyType] = cleanBodyContent;
        return bodyContentMap;
      }, {});

    // Filter out body blocks to get the remaining file content
    const fileContentWithoutBodyBlocks = fileContentBlocks.filter(block => 
      !bodyTypePatterns.some(pattern => block.startsWith(pattern))
    );

    return {
      bruFileStringWithRedactedBody: fileContentWithoutBodyBlocks.join(`${EOL}}${EOL}${EOL}`).concat(`${EOL}}${EOL}`),
      extractedBodyContent: extractedBodyBlocks
    };
  } catch (error) {
    console.error('Error parsing and redacting body data:', error);
    return {
      bruFileStringWithRedactedBody: bruFileContent,
      extractedBodyContent: {}
    };
  }
};