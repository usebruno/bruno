import { useDispatch, useSelector } from 'react-redux';
import { IconRefresh } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import { openCollectionModal, scanMyComputer } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { countOf } from 'providers/ReduxStore/slices/open-collection-modal/folder-results';
import { OPEN_COLLECTION_SUB_PAGE } from 'utils/common/constants';
import { countSearchLocations, searchesWholeComputer } from '../../../utils/search-locations';
import StyledWrapper from './StyledWrapper';

const MyComputerSubtitle = () => {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.openCollectionModal.myComputer.status);
  const locations = useSelector((state) => state.openCollectionModal.myComputer.locations);
  const error = useSelector((state) => state.openCollectionModal.myComputer.error);

  if (locations === null) {
    return <StyledWrapper />;
  }

  const isScanning = status === 'scanning';
  const hasFailed = status === 'error';
  const isWholeComputer = searchesWholeComputer(locations);
  const locationCountText = countOf(countSearchLocations(locations), 'location');
  const scanningText = isWholeComputer ? 'Searching my computer…' : `Searching ${locationCountText}…`;
  const doneText = `Collections found in ${isWholeComputer ? 'this computer' : locationCountText} ·`;
  const failedText = 'Search didn’t finish ·';

  return (
    <StyledWrapper data-testid="my-computer-subtitle">
      <span className="subtitle-text" role="status" title={hasFailed ? error : undefined}>
        {isScanning ? scanningText : hasFailed ? failedText : doneText}
      </span>
      <button
        type="button"
        className="subtitle-manage text-link hover:underline whitespace-nowrap"
        onClick={() => dispatch(openCollectionModal(OPEN_COLLECTION_SUB_PAGE.LOCATIONS))}
        data-testid="my-computer-manage"
      >
        Manage
      </button>
      <ActionIcon
        type="button"
        size="xs"
        className="subtitle-rescan"
        aria-label="Rescan locations"
        title="Rescan locations"
        aria-disabled={isScanning}
        onClick={isScanning ? undefined : () => dispatch(scanMyComputer())}
        data-testid="my-computer-rescan"
      >
        <IconRefresh size={12} strokeWidth={2} className={isScanning ? 'is-spinning' : undefined} />
      </ActionIcon>
    </StyledWrapper>
  );
};

export default MyComputerSubtitle;
