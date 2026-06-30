import { targets } from 'httpsnippet';

// Maps httpsnippet target keys to CodeMirror mode identifiers.
// Shell mode is not imported, and JSON-LD fallback mis-parses
// backtick continuation chars, corrupting syntax colors.
// Other targets keep their previous behaviour.
const TARGET_CM_MODE = {
  shell: 'text/plain'
};

export const getLanguages = () => {
  const allLanguages = [];
  for (const target of Object.values(targets)) {
    const { key, title } = target.info;
    const clients = Object.keys(target.clientsById);
    const language = TARGET_CM_MODE[key];
    const languages
      = (clients.length === 1)
        ? [{
            name: title,
            target: key,
            client: clients[0],
            language
          }]
        : clients.map((client) => ({
            name: `${title}-${client}`,
            target: key,
            client,
            language
          }));
    allLanguages.push(...languages);

    // Move "Shell-curl" to the top of the array
    const shellCurlIndex = allLanguages.findIndex((lang) => lang.name === 'Shell-curl');
    if (shellCurlIndex !== -1) {
      const [shellCurl] = allLanguages.splice(shellCurlIndex, 1);
      allLanguages.unshift(shellCurl);
    }
  }

  return allLanguages;
};
