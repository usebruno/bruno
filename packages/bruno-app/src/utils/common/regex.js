const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g; // replace invalid characters with hyphens
const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
const firstCharacter = /^[^.\s\-\<>:"/\\|?*\x00-\x1F]/; // no dot, space, or hyphen at start
const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/;   // no invalid characters
const lastCharacter = /[^.\s]$/;  // no dot or space at end, hyphen allowed

export const variableNameRegex = /^[\w-.]*$/;

export const sanitizeName = (name) => {
    name = name
        .replace(invalidCharacters, '-')       // replace invalid characters with hyphens
        .replace(/^[.\s-]+/, '')               // remove leading dots, hyphens and spaces
        .replace(/[.\s]+$/, '');               // remove trailing dots and spaces (keep trailing hyphens)
    return name;
};

export const validateName = (name) => {
    if (name.length > 255) return false;          // max filename length

    if (reservedDeviceNames.test(name)) return false; // windows reserved names

    return (
        firstCharacter.test(name) &&
        middleCharacters.test(name) &&
        lastCharacter.test(name)
    );
};

export const validateNameError = (name) => {
    if (name.length > 255) {
        return "Filename cannot exceed 255 characters.";
    }

    if (reservedDeviceNames.test(name)) {
        return "Filename cannot be a reserved device name.";
    }

    if (!firstCharacter.test(name[0])) {
        return "Filename cannot start with a dot (.), space, or hyphen (-).";
    }

    for (let i = 1; i < name.length - 1; i++) {
        if (!middleCharacters.test(name[i])) {
            return `Invalid character '${name[i]}' at position ${i + 1}.`;
        }
    }

    if (!lastCharacter.test(name[name.length - 1])) {
        return "Filename cannot end with a dot (.) or space.";
    }

    return '';
};