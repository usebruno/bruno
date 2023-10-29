import Bruno from 'components/Bruno/index';
import { useDispatch } from 'react-redux';
import { showHomePage } from 'providers/ReduxStore/slices/app';
import { showPreferences, updatePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import { IconSettings, IconActivity } from '@tabler/icons';

const TitleBar = () => {
  const dispatch = useDispatch();

  const openDevTools = () => {
    ipcRenderer.invoke('renderer:open-devtools');
  };

  const handleTitleClick = () => dispatch(showHomePage());

  return (
    <StyledWrapper className="px-2 py-2">
      <div className="flex items-center">
        <div className="flex items-center justify-center cursor-pointer flex-1" onClick={handleTitleClick}>
          <Bruno width={50} /> bruno
        </div>
        <div className="group flex-initial">
          <span className="group-title">Settings</span>
          <div className="flex flex-row justify-center">
            <div className="px-1 ">
              <button
                type="button"
                title="Preferences"
                className="btn btn-secondary btn-xs flex flex-row"
                onClick={(e) => {
                  dispatch(showPreferences(true));
                }}
              >
                <IconSettings strokeWidth={1.5} />
              </button>
            </div>
            <div className="">
              <button
                type="button"
                className="btn btn-xs flex flex-row"
                title="Devtools"
                onClick={(e) => {
                  openDevTools();
                }}
              >
                <IconActivity strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default TitleBar;
