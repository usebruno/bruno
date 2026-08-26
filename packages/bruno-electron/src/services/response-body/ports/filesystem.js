/**
 * @typedef {object} FileSystemPort
 * @property {(dir: string) => void | Promise<void>} mkdirp
 * @property {(filePath: string, data: Buffer|string) => void | Promise<void>} writeFile
 * @property {(filePath: string) => import('node:fs').WriteStream} createWriteStream
 * @property {(filePath: string) => import('node:fs').ReadStream} [createReadStream]
 * @property {(filePath: string, options?: { position?: number, length?: number }) => Promise<Buffer>} readFileRange
 * @property {(filePath: string) => Promise<Buffer>} readFile
 * @property {(src: string, dest: string) => Promise<void>} copyFile
 * @property {(filePath: string) => Promise<void>} unlink
 * @property {(filePath: string) => boolean} existsSync
 */

/**
 * @typedef {() => string} IdPort
 */

module.exports = {};
