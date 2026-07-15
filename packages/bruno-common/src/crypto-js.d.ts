// crypto-js ships no bundled types and @types/crypto-js is not a repo dependency.
// We only use HmacSHA256, SHA256 and enc.Base64, so a permissive ambient module is sufficient.
declare module 'crypto-js';
