import React, { useState } from 'react';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';

const { ipcRenderer } = window;

const SshConnectionDialog = ({ isOpen, onClose, onConnect }) => {
  const [config, setConfig] = useState({
    host: '',
    port: '22',
    username: '',
    authMethod: 'privateKey', // 'privateKey' or 'password'
    privateKey: '',
    passphrase: '',
    password: ''
  });
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!config.host || !config.username) {
      toast.error('Host and username are required');
      return;
    }

    if (config.authMethod === 'privateKey' && !config.privateKey) {
      toast.error('Private key path is required');
      return;
    }

    if (config.authMethod === 'password' && !config.password) {
      toast.error('Password is required');
      return;
    }

    setConnecting(true);

    try {
      const result = await ipcRenderer.invoke('renderer:ssh-connect', config);

      if (result.success) {
        toast.success('Connected to SSH server');
        onConnect(result.connectionId, config);
        onClose();
      } else {
        toast.error(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Modal
      size="md"
      title="Connect to SSH Server"
      confirmText={connecting ? 'Connecting...' : 'Connect'}
      cancelText="Cancel"
      handleConfirm={handleConnect}
      handleCancel={onClose}
      disableConfirm={connecting}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Host *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            placeholder="example.com or 192.168.1.100"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Port</label>
          <input
            type="number"
            className="w-full px-3 py-2 border rounded"
            placeholder="22"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Username *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded"
            placeholder="username"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Authentication Method</label>
          <select
            className="w-full px-3 py-2 border rounded"
            value={config.authMethod}
            onChange={(e) => setConfig({ ...config, authMethod: e.target.value })}
          >
            <option value="privateKey">Private Key</option>
            <option value="password">Password</option>
          </select>
        </div>

        {config.authMethod === 'privateKey' ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Private Key Path *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="/home/user/.ssh/id_rsa"
                value={config.privateKey}
                onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Passphrase (if encrypted)</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded"
                placeholder="Passphrase"
                value={config.passphrase}
                onChange={(e) => setConfig({ ...config, passphrase: e.target.value })}
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              placeholder="Password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SshConnectionDialog;
