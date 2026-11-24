import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';

const encodeKeychainField = (value) => encodeURIComponent(value)
  .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

const encodeReference = (entry) => `${encodeKeychainField(entry.account)}::${encodeKeychainField(entry.service)}::${entry.keychainId}`;

const MacKeychainPicker = ({ openRequest = 0, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [keychains, setKeychains] = useState([]);
  const [selectedKeychainId, setSelectedKeychainId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedKeychain = keychains.find((keychain) => keychain.id === selectedKeychainId);
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    const entries = selectedKeychain?.entries || [];
    if (!query) return entries;
    return entries.filter((entry) => `${entry.label} ${entry.service} ${entry.account}`.toLowerCase().includes(query));
  }, [selectedKeychain, search]);

  const openPicker = useCallback(async () => {
    setIsOpen(true);
    setSelectedEntry(null);
    setLoading(true);
    setError('');
    try {
      const availableKeychains = await window.ipcRenderer.invoke('renderer:list-keychain-passwords');
      setKeychains(availableKeychains);
      setSelectedKeychainId(availableKeychains.find((keychain) => keychain.entries.length)?.id || availableKeychains[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message || 'Unable to read macOS Keychain items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openRequest > 0) openPicker();
  }, [openPicker, openRequest]);

  const insertFieldReference = (field) => {
    const reference = encodeReference(selectedEntry);
    onSelect(`@keychain.getUser:(${reference}).${field}`);
    setIsOpen(false);
    toast.success(`Keychain ${field} reference inserted.`);
  };

  return isOpen ? (
    <Modal size="md" title="Select Keychain User" hideFooter handleCancel={() => setIsOpen(false)}>
      <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        Choose a Keychain item and then insert its username or secret. The expression is saved in the environment; the password is read from Keychain when a request runs.
      </div>
      {!loading && !error && keychains.length ? (
        <div className="mb-3 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Mac keychains">
          {keychains.map((keychain) => (
            <button
              type="button"
              key={keychain.id}
              role="tab"
              aria-selected={selectedKeychainId === keychain.id}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm${selectedKeychainId === keychain.id ? ' border-blue-500 text-blue-600' : ' border-transparent text-gray-500'}`}
              onClick={() => {
                setSelectedKeychainId(keychain.id);
                setSelectedEntry(null);
              }}
              data-testid="keychain-tab"
            >
              {keychain.label}
            </button>
          ))}
        </div>
      ) : null}
      <input
        type="search"
        className="w-full mb-3"
        placeholder="Search by name, service, or account"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Search Keychain users"
      />
      <div className="max-h-72 overflow-y-auto" data-testid="keychain-password-list">
        {loading ? <div className="py-3 text-sm">Loading Keychain items…</div> : null}
        {!loading && error ? <div className="py-3 text-sm text-red-600">{error}</div> : null}
        {!loading && !error && keychains.length === 0 ? (
          <div className="py-3 text-sm text-gray-500">No macOS Keychains are available.</div>
        ) : null}
        {!loading && !error && selectedKeychain?.error ? (
          <div className="py-3 text-sm text-red-600">{selectedKeychain.error}</div>
        ) : null}
        {!loading && !error && !selectedKeychain?.error && filteredEntries.length === 0 ? (
          <div className="py-3 text-sm text-gray-500">No generic password items found in this Keychain.</div>
        ) : null}
        {!loading && !error && filteredEntries.map((entry) => {
          const entryKey = `${entry.keychainId}\u0000${entry.service}\u0000${entry.account}`;
          const isSelected = selectedEntry?.keychainId === entry.keychainId
            && selectedEntry?.service === entry.service
            && selectedEntry?.account === entry.account;
          return (
            <button
              type="button"
              key={entryKey}
              className={`flex w-full flex-col items-start border-b border-gray-200 px-2 py-2 text-left hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800${isSelected ? ' bg-gray-100 dark:bg-gray-800' : ''}`}
              onClick={() => setSelectedEntry(entry)}
              data-testid="keychain-password-item"
            >
              <span className="font-medium">{entry.label}</span>
              <span className="text-xs text-gray-500">{entry.service} · {entry.account}</span>
            </button>
          );
        })}
      </div>
      {selectedEntry ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm">Insert {selectedEntry.account} as:</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              onClick={() => insertFieldReference('username')}
              data-testid="keychain-insert-username"
            >
              .username
            </button>
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              onClick={() => insertFieldReference('secret')}
              data-testid="keychain-insert-secret"
            >
              .secret
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  ) : null;
};

export default MacKeychainPicker;
