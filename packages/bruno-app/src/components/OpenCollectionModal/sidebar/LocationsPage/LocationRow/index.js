import classnames from 'classnames';
import { IconFolder, IconX } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import { tildify } from '../../../utils/collection-location';
import { focusNextTabbable } from '../../../utils/focus';
import { describeLocationStatus } from '../../../utils/search-locations';
import StyledWrapper from './StyledWrapper';

const LOCATION_LABELS = {
  'default-location': 'Default collection location',
  'documents': 'Documents/bruno',
  'workspace': 'All open workspace folders'
};

const LocationRow = ({ row, onRemove }) => {
  const isUserFolder = row.kind === 'user';
  const status = describeLocationStatus(row);

  const remove = (event) => {
    focusNextTabbable(event.currentTarget);
    onRemove(row.path);
  };

  return (
    <StyledWrapper data-testid="locations-row">
      <IconFolder size={15} strokeWidth={1.6} aria-hidden="true" />
      <span className={classnames('location-row-label', { 'is-path': isUserFolder })} title={row.title} data-testid="locations-row-label">
        {isUserFolder ? tildify(row.path) : LOCATION_LABELS[row.kind]}
      </span>
      <span className={classnames('location-row-status', { 'is-problem': status.isProblem })} data-testid="locations-row-status">
        {status.text}
      </span>
      {isUserFolder ? (
        <ActionIcon
          type="button"
          size="sm"
          aria-label={`Stop looking in ${row.path}`}
          onClick={remove}
          data-testid="locations-row-remove"
        >
          <IconX size={12} strokeWidth={2} />
        </ActionIcon>
      ) : (
        <span className="location-row-spacer" />
      )}
    </StyledWrapper>
  );
};

export default LocationRow;
