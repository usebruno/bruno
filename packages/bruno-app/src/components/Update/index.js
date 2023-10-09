import Modal from 'components/Modal/index';
import classnames from 'classnames';
import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import MarkdownIt from 'markdown-it';
import { useTheme } from 'providers/Theme';

const md = new MarkdownIt();

const Update = ({ onClose }) => {
  const [latestVersionBody, setLatestVersionBody] = useState('Loading...');
  const themeContext = useTheme();

  ipcRenderer.invoke('renderer:get-latest-version').then((val) => setLatestVersionBody(md.render(val.body)));

  return (
    <StyledWrapper theme={themeContext.theme}>
      <Modal size="lg" title="Update" handleCancel={onClose} hideFooter={true}>
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: latestVersionBody }}></div>
      </Modal>
    </StyledWrapper>
  );
};

export default Update;
