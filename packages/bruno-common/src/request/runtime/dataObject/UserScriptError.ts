export class UserScriptError extends Error {
  constructor(originalError: unknown, script: string) {
    const formattedError = originalError instanceof Error ? originalError.stack : String(originalError);

    const fullMessage = `
UserScriptError: This error occurred inside your script!

=== Begin of orignal error ===
${formattedError}
=== End of orignal error ===

=== Begin of user script ===
${script.trim()}
=== End of user script ===
        `.trim();

    super(fullMessage);
  }
}
