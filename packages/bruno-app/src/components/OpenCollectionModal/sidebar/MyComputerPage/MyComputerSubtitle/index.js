import { useDispatch, useSelector } from 'react-redux';
import { IconRefresh } from '@tabler/icons';
import { openCollectionModal, scanMyComputer } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { countOf } from 'providers/ReduxStore/slices/open-collection-modal/folder-results';
import { countSearchLocations, searchesWholeComputer } from '../../../utils/search-locations';
import StyledWrapper from './StyledWrapper';

const MyComputerSubtitle = () => {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.openCollectionModal.myComputer.status);
  const locations = useSelector((state) => state.openCollectionModal.myComputer.locations);

  if (locations === null) {
    return <StyledWrapper />;
  }

  const isScanning = status === 'scanning';
  const isWholeComputer = searchesWholeComputer(locations);
  const locationCountText = countOf(countSearchLocations(locations), 'location');
  const scanningText = isWholeComputer ? 'Searching my computer…' : `Searching ${locationCountText}…`;
  const doneText = `Collections found in ${isWholeComputer ? 'this computer' : locationCountText} ·`;

  return (
    <StyledWrapper data-testid="my-computer-subtitle">
      <span className="subtitle-text" role="status">
        {isScanning ? scanningText : doneText}
      </span>
      <button
        type="button"
        className="subtitle-manage text-link hover:underline whitespace-nowrap"
        onClick={() => dispatch(openCollectionModal('locations'))}
        data-testid="my-computer-manage"
      >
        Manage
      </button>
      <button
        type="button"
        className="subtitle-rescan"
        aria-label="Rescan locations"
        title="Rescan locations"
        aria-disabled={isScanning}
        onClick={isScanning ? undefined : () => dispatch(scanMyComputer())}
        data-testid="my-computer-rescan"
      >
        <IconRefresh size={12} strokeWidth={2} className={isScanning ? 'is-spinning' : undefined} />
      </button>
    </StyledWrapper>
  );
};

export default MyComputerSubtitle;
