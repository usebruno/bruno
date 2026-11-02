const crypto = require('node:crypto');

const md4 = require('js-md4');

const NEGOTIATE_UNICODE = 1;
const NEGOTIATE_NTLM2_KEY = 1 << 19;
const NEGOTIATE_TARGET_INFO = 1 << 23;

const HEADER_SCHEME = 'NTLM ';
const SIGNATURE = 'NTLMSSP\0';
const MESSAGE_TYPE_OFFSET = SIGNATURE.length;
const CHALLENGE_MESSAGE_TYPE = 2;
const TARGET_NAME_FIELDS_OFFSET = 12;
const NEGOTIATE_FLAGS_OFFSET = 20;
const SERVER_CHALLENGE_OFFSET = 24;
const TARGET_INFO_FIELDS_OFFSET = 40;
const HEADER_SIZE = 48;
const TARGET_INFO_TERMINATOR_SIZE = 4;
const NT_RESPONSE_OFFSET = 20;
const DOMAIN_OFFSET = 28;
const USERNAME_OFFSET = 36;
const PROOF_SIZE = 16;

// A security buffer points at data after the header: its length, its max length (which senders set to the same), then where it starts.
const writeSecurityBuffer = (message, offset, { length, start }) => {
  message.writeUInt16LE(length, offset);
  message.writeUInt16LE(length, offset + 2);
  message.writeUInt32LE(start, offset + 4);
};

const readSecurityBuffer = (message, offset) => {
  const length = message.readUInt16LE(offset);
  const start = message.readUInt32LE(offset + 4);
  return message.subarray(start, start + length);
};

/**
 * Only the challenge is built here, since type 1 and type 3 come from the client under test. The
 * caller keeps the nonce with its connection because the client keys its proof by it, so a proof
 * answering one connection cannot be replayed onto another.
 */
const type2Message = (challenge) => {
  const message = Buffer.alloc(HEADER_SIZE + TARGET_INFO_TERMINATOR_SIZE);

  message.write(SIGNATURE, 0, 'ascii');
  message.writeUInt32LE(CHALLENGE_MESSAGE_TYPE, MESSAGE_TYPE_OFFSET);
  writeSecurityBuffer(message, TARGET_NAME_FIELDS_OFFSET, { length: 0, start: HEADER_SIZE });
  message.writeUInt32LE(NEGOTIATE_UNICODE | NEGOTIATE_NTLM2_KEY | NEGOTIATE_TARGET_INFO, NEGOTIATE_FLAGS_OFFSET);
  challenge.copy(message, SERVER_CHALLENGE_OFFSET);
  writeSecurityBuffer(message, TARGET_INFO_FIELDS_OFFSET, { length: TARGET_INFO_TERMINATOR_SIZE, start: HEADER_SIZE });

  return `${HEADER_SCHEME}${message.toString('base64')}`;
};

const decodeHeader = (authorization) =>
  (authorization?.startsWith(HEADER_SCHEME) ? Buffer.from(authorization.slice(HEADER_SCHEME.length), 'base64') : null);

const messageType = (authorization) => {
  const message = decodeHeader(authorization);

  if (!message || message.toString('ascii', 0, SIGNATURE.length) !== SIGNATURE) {
    return null;
  }

  return message.readUInt32LE(MESSAGE_TYPE_OFFSET);
};

const parseType3Message = (authorization) => {
  const message = decodeHeader(authorization);

  return {
    ntResponse: readSecurityBuffer(message, NT_RESPONSE_OFFSET),
    domain: readSecurityBuffer(message, DOMAIN_OFFSET).toString('ucs2'),
    username: readSecurityBuffer(message, USERNAME_OFFSET).toString('ucs2')
  };
};

const ntlmHashOf = (password) => {
  const hash = md4.create();
  hash.update(Buffer.from(password, 'ucs2'));
  return Buffer.from(hash.buffer());
};

/**
 * The proof is recomputed rather than trusted, so no test can pass against a server that accepts
 * any credentials. The arithmetic is the one in MS-NLMP 3.3.2 so an unmodified client verifies
 * here, with the password standing in for the hash a domain controller would hold instead.
 */
const provesPassword = (authorization, password, challenge) => {
  const { ntResponse, domain, username } = parseType3Message(authorization);

  if (ntResponse.length <= PROOF_SIZE) {
    return false;
  }

  const proof = ntResponse.subarray(0, PROOF_SIZE);
  const blob = ntResponse.subarray(PROOF_SIZE);
  const ntlmv2Hash = crypto
    .createHmac('md5', ntlmHashOf(password))
    .update(Buffer.from(`${username.toUpperCase()}${domain}`, 'ucs2'))
    .digest();
  const expected = crypto
    .createHmac('md5', ntlmv2Hash)
    .update(Buffer.concat([challenge, blob]))
    .digest();

  return crypto.timingSafeEqual(proof, expected);
};

module.exports = { type2Message, messageType, provesPassword };
