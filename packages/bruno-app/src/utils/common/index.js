import { customAlphabet } from "nanoid";

// a customized version of nanoid without using _ and -
export const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};

export const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return new Uint32Array([hash])[0].toString(36);
};

export const waitForNextTick = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 0);
  });
};
