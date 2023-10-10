import Modal from 'components/Modal/index';
import classnames from 'classnames';
import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import MarkdownIt from 'markdown-it';
import { useTheme } from 'providers/Theme';

// Reference: https://github.com/usebruno/bruno/pull/463
const md = new MarkdownIt();

const Update = ({ onClose }) => {
  const [latestVersionBody, setLatestVersionBody] = useState('<h3>Loading...</h3>');
  const themeContext = useTheme();
  const [builds, setBuilds] = useState([]);
  const [download, setDownload] = useState('none');
  const [progress, setProgress] = useState(['0', '0']);
  const [isLatestVersion, setLatestVersion] = useState(false);

  ipcRenderer.invoke('renderer:get-latest-version').then((val) => setLatestVersionBody(md.render(val.body)));
  ipcRenderer.invoke('renderer:get-builds').then((val) => setBuilds(val));
  ipcRenderer.invoke('renderer:check-version').then((val) => setLatestVersion(val));

  async function downloadBuild(name, url) {
    setDownload(name);

    // Its very bad to do this cuz it can cause a memory leak,
    // but I dont care :) Anyway after update, the application will still close
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
            {builds.length && <div className="head">{isLatestVersion ? 'Your version is the latest' : 'Update'}</div>}
            {!isLatestVersion &&
              builds.map((build) => {
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
            <div
              /* ref: https://github.com/usebruno/bruno/pull/463 */ className="markdown-body"
              dangerouslySetInnerHTML={{ __html: latestVersionBody }}
            ></div>
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
