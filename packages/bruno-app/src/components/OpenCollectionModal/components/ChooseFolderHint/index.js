import { IconInfoCircle } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import useKeybindingDisplayText from 'hooks/useKeybindingDisplayText';
import StyledWrapper from './StyledWrapper';

const HINT_TEXT = 'Select a Bruno collection folder manually';

const ChooseFolderHint = ({ id }) => {
  const shortcut = useKeybindingDisplayText()('openCollection');

  return (
    <StyledWrapper>
      <ToolHint
        toolhintId={id}
        dataTestId={id}
        text={shortcut ? `${HINT_TEXT} (${shortcut})` : HINT_TEXT}
        place="bottom-end"
        offset={6}
        positionStrategy="fixed"
      >
        <IconInfoCircle size={13} strokeWidth={1.75} className="choose-folder-hint-icon" aria-hidden="true" />
      </ToolHint>
    </StyledWrapper>
  );
};

export default ChooseFolderHint;
