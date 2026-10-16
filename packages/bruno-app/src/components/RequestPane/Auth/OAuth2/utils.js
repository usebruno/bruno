// OAuth2 configuration values are single-line even when pasted from multiline sources.
export const replaceLineBreaksWithSpaces = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/\r\n|\r|\n/g, ' ');
};
