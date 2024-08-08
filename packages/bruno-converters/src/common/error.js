// levels: 'warning, error'
export class BrunoError extends Error {
  constructor(message, level) {
    super(message);
    this.name = 'BrunoError';
    this.level = level || 'error';
  }
}
