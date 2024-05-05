import React from 'react';
import Modal from 'components/Modal/index';
import { IconSpeakerphone, IconBrandGithub, IconBrandDiscord, IconBook } from '@tabler/icons-react';
import StyledWrapper from './StyledWrapper';

const BrunoSupport = ({ onClose }) => {
  return (
    <StyledWrapper>
      <Modal size="sm" title={'Support'} handleCancel={onClose} hideFooter={true}>
        <div className="collection-options">
          <div className="mt-2">
            <a href="https://docs.usebruno.com" target="_blank" className="flex items-end">
              <IconBook size={18} strokeWidth={2} />
              <span className="label ml-2">Documentation</span>
            </a>
          </div>
          <div className="mt-2">
            <a href="https://github.com/its-treason/bruno/issues" target="_blank" className="flex items-end">
              <IconSpeakerphone size={18} strokeWidth={2} />
              <span className="label ml-2">Report Issues</span>
            </a>
          </div>
          <div className="mt-2">
            <a href="https://discordapp.com/users/139058134596583424" target="_blank" className="flex items-end">
              <IconBrandDiscord size={18} strokeWidth={2} />
              <span className="label ml-2">Discord</span>
            </a>
          </div>
          <div className="mt-2">
            <a href="https://github.com/its-treason/bruno" target="_blank" className="flex items-end">
              <IconBrandGithub size={18} strokeWidth={2} />
              <span className="label ml-2">GitHub</span>
            </a>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default BrunoSupport;
