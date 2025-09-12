import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconCheck, IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import Modal from 'components/Modal/index';
import CodeEditor from 'components/CodeEditor';

const GrpcurlModal = ({ isOpen, onClose, command }) => {
  const { displayedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const preferences = useSelector(state => state.app.preferences);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success('Command copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy command');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      handleCancel={onClose}
      title={(
        <div className="flex items-center gap-2">
          <span>Generate gRPCurl Command</span>
        </div>
      )}
      size="lg"
      hideFooter={true}
    >
      <div>
        <div className="flex w-full min-h-[400px]">
          <div className="flex-grow relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={handleCopy}
                className="btn btn-sm btn-secondary flex items-center gap-2"
              >
                {copied ? <IconCheck size={20} /> : <IconCopy size={20} />}
              </button>
            </div>
            <CodeEditor
              value={command}
              theme={displayedTheme}
              readOnly={true}
              mode="shell"
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GrpcurlModal;
