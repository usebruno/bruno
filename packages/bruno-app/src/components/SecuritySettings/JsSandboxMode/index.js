import { useDispatch } from 'react-redux';
import { IconShieldCheck, IconCode } from '@tabler/icons';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { uuid } from 'utils/common/index';
import JsSandboxModeModal from '../JsSandboxModeModal';
import StyledWrapper from './StyledWrapper';

const JsSandboxMode = ({ collection }) => {
  const jsSandboxMode = collection?.securityConfig?.jsSandboxMode;
  const dispatch = useDispatch();

  const viewSecuritySettings = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'security-settings'
      })
    );
  };

  return (
    <StyledWrapper className="flex">
      {jsSandboxMode === 'safe' && (
        <div
          className="sandbox-icon safe-mode"
          data-testid="sandbox-mode-selector"
          onClick={viewSecuritySettings}
          title="Safe Mode"
        >
          <IconShieldCheck size={14} strokeWidth={2} />
        </div>
      )}
      {jsSandboxMode === 'developer' && (
        <div
          className="sandbox-icon developer-mode"
          data-testid="sandbox-mode-selector"
          onClick={viewSecuritySettings}
          title="Developer Mode"
        >
          <IconCode size={14} strokeWidth={2} />
        </div>
      )}
      {!jsSandboxMode ? <JsSandboxModeModal collection={collection} /> : null}
    </StyledWrapper>
  );
};

export default JsSandboxMode;
