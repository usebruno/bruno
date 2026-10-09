import { useDispatch } from 'react-redux';
import { Tooltip } from 'react-tooltip';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { REQUESTS_NOT_LOADED_ID } from 'components/CollectionSettings/Overview/RequestsNotLoaded';
import CountBadge from 'ui/CountBadge';
import StyledWrapper from './StyledWrapper';

const InvalidFilesBadge = ({ count, collectionUid, rowUid, showOverviewLink = false }) => {
  const dispatch = useDispatch();

  if (!count) {
    return null;
  }

  const tooltipId = `invalid-files-${rowUid}`;

  const stopRowEvent = (e) => e.stopPropagation();

  const handleSeeHere = () => {
    dispatch(updateSettingsSelectedTab({ collectionUid, tab: 'overview' }));
    dispatch(addTab({ uid: collectionUid, collectionUid, type: 'collection-settings' }));
    requestAnimationFrame(() => {
      document.getElementById(REQUESTS_NOT_LOADED_ID)?.scrollIntoView({ block: 'nearest' });
    });
  };

  return (
    <StyledWrapper className="flex-shrink-0 mx-1">
      <CountBadge variant="danger" className="invalid-files-count" data-tooltip-id={tooltipId} tabIndex={0} data-testid="invalid-files-badge">
        {count}
      </CountBadge>
      <span onClick={stopRowEvent} onContextMenu={stopRowEvent}>
        <Tooltip
          id={tooltipId}
          className="tooltip-mod"
          place="bottom-start"
          positionStrategy="fixed"
          clickable={showOverviewLink}
          noArrow
          opacity={1}
        >
          <span data-testid="invalid-files-tooltip">
            You have {count} invalid {count === 1 ? 'file' : 'files'}.
            {showOverviewLink ? (
              <>
                {' '}
                <button type="button" className="text-link hover:underline" onClick={handleSeeHere} data-testid="invalid-files-see-here">
                  See here
                </button>
              </>
            ) : null}
          </span>
        </Tooltip>
      </span>
    </StyledWrapper>
  );
};

export default InvalidFilesBadge;
