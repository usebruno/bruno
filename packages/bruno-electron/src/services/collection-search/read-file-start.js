const fs = require('node:fs/promises');

const readFileStart = async (filePath, byteCount) => {
  try {
    const file = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(byteCount);
      const { bytesRead } = await file.read(buffer, 0, byteCount, 0);
      return buffer.subarray(0, bytesRead).toString('utf8');
    } finally {
      await file.close();
    }
  } catch (error) {
    return '';
  }
};

module.exports = {
  readFileStart
};
