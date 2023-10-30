import { Vault } from '@usebruno/js';
import handlebars from 'handlebars';

const getVaultVars = (env) => {
  let vaultVars = {};
  const keys = ['VAULT_PATH_PREFIX', 'VAULT_ADDR', 'VAULT_TOKEN_FILE_PATH', 'VAULT_PROXY'];
  for (const key of keys) {
    if (!env[key]) {
      continue;
    }

    const template = handlebars.compile(env[key], { noEscape: true });
    vaultVars[key] = template({ process: env.process });
  }

  return vaultVars;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(400).json({ error: 'Bad method' });
  }

  const { env, path, jsonPath, action } = req.body;

  const vaultVars = getVaultVars(env);
  const vault = Vault.getVault(vaultVars);

  if (!vault) {
    return res
      .status(400)
      .json({ error: 'Vault not initialized. Check your VAULT_ADDR and VAULT_TOKEN_FILE_PATH variables.' });
  }

  switch (action) {
    case 'clear':
      await vault.clearCache(path);
      return res.status(200).json({ value: null });
    default:
      if (!path) {
        return res.status(400).json({ error: 'Missing path' });
      }

      const value = await vault.read(path, jsonPath, env);
      return res.status(200).json({ value });
  }
}
