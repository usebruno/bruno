export const variableNameRegex = /^[\w-.]*$/;

export const sanitizeName = (name) => {
    const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g; // Match one or more invalid characters
    return name
        .replace(invalidCharacters, '-')       // Replace invalid characters with hyphens
        .replace(/^[\.\-\s]+|[\.\s]+$/g, '');  // Remove leading dots, hyphens, and spaces; remove trailing dots and spaces
};

export const validateName = (name) => {
    const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
    const firstCharacter = /^[^ \-\<>:"/\\|?*\x00-\x1F]/;
    const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/;
    const lastCharacter = /[^.\ ]$/;

    return (
        !reservedDeviceNames.test(name) &&
        firstCharacter.test(name) &&
        middleCharacters.test(name) &&
        lastCharacter.test(name)
    );
}

export const validateNameError = (name) => {
    const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
    const firstCharacter = /^[^ \-\<>:"/\\|?*\x00-\x1F]/;
    const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/;
    const lastCharacter = /[^.\ ]$/;

    // reserved device names
    if (reservedDeviceNames.test(name)) {
        return "Filename cannot be a reserved device name.";
    }

    // first character
    if (!firstCharacter.test(name[0])) {
        return `Invalid first character`;
    }

    // middle characters
    for (let i = 1; i < name.length - 1; i++) {
        if (!middleCharacters.test(name[i])) {
            return `Invalid character in the middle - ${name[i]} at position ${i}`
        }
    }

    // last character
    if (!lastCharacter.test(name[name.length - 1])) {
        return `Invalid last character`
    }

    return '';
};
