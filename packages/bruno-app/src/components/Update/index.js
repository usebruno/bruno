import Modal from 'components/Modal/index';
import classnames from 'classnames';
import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import MarkdownIt from 'markdown-it';
import { useTheme } from 'providers/Theme';

const md = new MarkdownIt();

const Update = ({ onClose }) => {
  const [latestVersionBody, setLatestVersionBody] = useState('<h3>Loading...</h3>');
  const themeContext = useTheme();
  const [builds, setBuilds] = useState([]);
  const [download, setDownload] = useState('none');
  const [progress, setProgress] = useState(['0', '0']);

  ipcRenderer.invoke('renderer:get-latest-version').then((val) => setLatestVersionBody(md.render(val.body)));
  ipcRenderer.invoke('renderer:get-builds').then((val) => setBuilds(val));

  async function downloadBuild(name, url) {
    setDownload(name);
    ipcRenderer.on('main:update-download-progress', (val, est) => {
      setProgress([(val * 100).toFixed(0), est ? est.toFixed(1) : '~']);
    });
    await ipcRenderer.invoke('renderer:download-update', name, url);
  }

  return (
    <StyledWrapper theme={themeContext.theme}>
      <Modal size="lg" title="Update" handleCancel={onClose} hideFooter={true}>
        {download == 'none' && (
          <div>
            {builds.length && <div className="head">Install</div>}
            {builds.map((build) => {
              return (
                <button
                  key={build.download}
                  onClick={() => downloadBuild(build.name, build.download)}
                  type="button"
                  className="submit btn btn-md btn-secondary mr-2"
                >
                  {build.arch} ( {build.ext} )
                </button>
              );
            })}
            <div className="head">Changelogs</div>
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: latestVersionBody }}></div>
          </div>
        )}
        {download != 'none' && (
          <div className="flex justify-center items-center h-16">
            Downloading {download} - {progress[0]}% ( {progress[1]}s )
          </div>
        )}
      </Modal>
    </StyledWrapper>
  );
};

export default Update;
