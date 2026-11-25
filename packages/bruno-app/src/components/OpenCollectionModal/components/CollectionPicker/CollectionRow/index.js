import classnames from 'classnames';
import Button from 'ui/Button';
import Checkbox from 'ui/Checkbox';
import { tildify } from '../../../utils/collection-location';
import StyledWrapper from './StyledWrapper';

const CollectionRow = ({ collection, location, isOpen, isSelected, testIdPrefix, onToggle, onOpen }) => {
  const metaText = isOpen ? 'Already open' : location;

  return (
    <StyledWrapper className={classnames({ 'is-open': isOpen })} data-testid={`${testIdPrefix}-row`}>
      <Checkbox
        className="collection-row-checkbox"
        checked={isSelected}
        disabled={isOpen}
        onChange={onToggle}
        ariaLabel={`Select ${collection.name}`}
        label={(
          <>
            <span className="collection-row-main">
              <span className="collection-row-name">{collection.name}</span>
              <span className="collection-row-path" title={collection.path}>
                {tildify(collection.path)}
              </span>
            </span>
            <span className="collection-row-meta" title={metaText}>
              {metaText}
            </span>
          </>
        )}
      />
      {!isOpen && (
        <Button
          size="sm"
          variant="outline"
          color="secondary"
          className="collection-row-action"
          onClick={onOpen}
          aria-label={`Open ${collection.name}`}
          data-testid={`${testIdPrefix}-row-open`}
        >
          Open
        </Button>
      )}
    </StyledWrapper>
  );
};

export default CollectionRow;
