/**
 * Parses a .bru file and extracts body content while redacting it from the main content
 * @param {string} bruFileContent - The raw content of the .bru file
 * @returns {Object} Object containing redacted file content and extracted body data
 */
export declare const bruRequestParseAndRedactBodyData: (bruFileContent: string) => {
    bruFileStringWithRedactedBody: string;
    extractedBodyContent: Record<string, string>;
};
