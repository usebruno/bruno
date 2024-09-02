import { targets } from 'httpsnippet';

export const getLanguages = () => {
  const allLanguages = [];
  console.log(Object.values(targets));
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
          name: `${title} - ${client}`,
          target: key,
          client
        }));
    allLanguages.push(...languages);
  }
  return allLanguages;
};