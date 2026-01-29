const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g; // replace invalid characters with hyphens
const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
const firstCharacter = /^[^\s\-<>:"/\\|?*\x00-\x1F]/; // no space, hyphen and `invalidCharacters`
const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/; // no `invalidCharacters`
const lastCharacter = /[^.\s<>:"/\\|?*\x00-\x1F]$/; // no dot, space and `invalidCharacters`

export const variableNameRegex = /^[\w-.]*$/;

// HTTP header name should not contain spaces, newlines, or control characters
export const headerNameRegex = /^[^\s\r\n]*$/;

// HTTP header value should not contain newlines
export const headerValueRegex = /^[^\r\n]*$/;

export const sanitizeName = (name) => {
  name = name
    .replace(invalidCharacters, '-') // replace invalid characters with hyphens
    .replace(/^[\s\-]+/, '') // remove leading spaces and hyphens
    .replace(/[.\s]+$/, ''); // remove trailing dots and spaces
  return name;
};

export const validateName = (name) => {
  if (!name) return false;
  if (name.length > 255) return false; // max name length

  if (reservedDeviceNames.test(name)) return false; // windows reserved names

  return (
    firstCharacter.test(name)
    && middleCharacters.test(name)
    && lastCharacter.test(name)
  );
};

export const validateNameError = (name) => {
  if (!name) return 'Name cannot be empty.';

  if (name.length > 255) {
    return 'Name cannot exceed 255 characters.';
  }

  if (reservedDeviceNames.test(name)) {
    return 'Name cannot be a reserved device name.';
  }

  if (!firstCharacter.test(name[0])) {
    return `Special characters aren't allowed in the name. Invalid character '${name[0]}'.`;
  }

  for (let i = 1; i < name.length - 1; i++) {
    if (!middleCharacters.test(name[i])) {
      return `Special characters aren't allowed in the name. Invalid character '${name[i]}'.`;
    }
  }

  if (!lastCharacter.test(name[name.length - 1])) {
    return `Special characters aren't allowed in the name. Invalid character '${name[name.length - 1]}'.`;
  }

  return '';
};
