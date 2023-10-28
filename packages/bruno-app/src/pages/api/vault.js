import { getVault } from 'bruno/src/vault/vault';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(400).json({ error: 'Bad method' });
  }

  const { VAULT_ADDR, VAULT_TOKEN_FILE_PATH, VAULT_PATH_PREFIX, path, jsonPath, action } = req.body;
  const vault = getVault({ VAULT_ADDR, VAULT_TOKEN_FILE_PATH, VAULT_PATH_PREFIX });
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

      const value = await vault.read(path, jsonPath);
      return res.status(200).json({ value });
  }
}
