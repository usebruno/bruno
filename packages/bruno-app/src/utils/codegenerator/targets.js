import { targets } from 'httpsnippet';

export const getLanguages = () => {
  const allLanguages = [];
  for (const target of Object.values(targets)) {
    const { key, title } = target.info;
    const clients = Object.keys(target.clientsById);
    const languages =
      (clients.length === 1)
        ? [{
          name: title,
          target: key,
          client: clients[0]
        }]
        : clients.map(client => ({
          name: `${title}-${client}`,
          target: key,
          client
        }));
    allLanguages.push(...languages);
    
    // Move "Shell-curl" to the top of the array
    const shellCurlIndex = allLanguages.findIndex(lang => lang.name === "Shell-curl");
    if (shellCurlIndex !== -1) {
      const [shellCurl] = allLanguages.splice(shellCurlIndex, 1);
      allLanguages.unshift(shellCurl);
    }
  }

  return allLanguages;
};