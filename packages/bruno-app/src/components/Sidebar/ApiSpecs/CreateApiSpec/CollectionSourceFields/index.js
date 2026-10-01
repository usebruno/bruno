import React from 'react';
import { Tooltip } from 'react-tooltip';
import MenuDropdown from 'ui/MenuDropdown';
import SegmentedControl from 'ui/SegmentedControl';
import { IconChevronDown } from '@tabler/icons';
import { COLLECTION_SOURCE, COLLECTION_SOURCE_ITEMS } from '../apiSpecSources';

const NO_COLLECTIONS_HINT = 'No collections in this workspace';

const CollectionSourceFields = ({
  formik,
  isWorkspaceSource,
  workspaceCollections,
  selectedWorkspaceCollection,
  environmentNames,
  loadError,
  onSelectSource,
  onSelectCollection,
  onSelectEnvironment,
  onBrowseCollection
}) => {
  const hasWorkspaceCollections = workspaceCollections.length > 0;

  const sourceItems = COLLECTION_SOURCE_ITEMS.map((item) => (
    item.value === COLLECTION_SOURCE.WORKSPACE && !hasWorkspaceCollections
      ? { ...item, disabled: true, className: 'segment-no-collections' }
      : item
  ));

  const collectionItems = workspaceCollections.map((collection) => ({
    id: collection.uid,
    label: collection.name,
    onClick: () => onSelectCollection(collection.uid)
  }));

  const environmentItems = environmentNames.map((environmentName) => ({
    id: environmentName,
    label: environmentName,
    onClick: () => onSelectEnvironment(environmentName)
  }));

  return (
    <>
      <div className="collection-source-control">
        <SegmentedControl
          ariaLabel="Collection source"
          name="collectionSource"
          value={isWorkspaceSource ? COLLECTION_SOURCE.WORKSPACE : COLLECTION_SOURCE.FILESYSTEM}
          onChange={onSelectSource}
          items={sourceItems}
          size="sm"
          data-testid="api-spec-collection-source"
        />
        {hasWorkspaceCollections ? null : (
          <Tooltip
            anchorSelect=".segment-no-collections"
            content={NO_COLLECTIONS_HINT}
            className="api-spec-hint-tooltip"
            place="top"
            data-testid="api-spec-no-collections"
          />
        )}
      </div>

      {isWorkspaceSource ? (
        <>
          <MenuDropdown
            items={collectionItems}
            selectedItemId={formik.values.collectionUid}
            data-testid="api-spec-collection-dropdown"
            menuClassName="max-h-64 overflow-y-auto"
            placement="bottom-start"
            appendTo={() => document.body}
            popperOptions={{ strategy: 'fixed' }}
            offset={[0, 0]}
            sameWidth
          >
            <button
              type="button"
              id="collection-select"
              className="collection-select-trigger flex items-center justify-between cursor-pointer mt-1 w-full"
              data-testid="api-spec-collection-trigger"
            >
              <span className={selectedWorkspaceCollection ? 'truncate' : 'truncate placeholder'}>
                {selectedWorkspaceCollection?.name || 'Select a collection'}
              </span>
              <IconChevronDown className="caret" size={14} strokeWidth={2} />
            </button>
          </MenuDropdown>
          {loadError || (formik.touched.collectionUid && formik.errors.collectionUid) ? (
            <div className="text-red-500 break-words">{loadError || formik.errors.collectionUid}</div>
          ) : null}
        </>
      ) : (
        <>
          <input
            id="collection-location"
            type="text"
            name="collectionLocation"
            readOnly={true}
            placeholder="Choose file..."
            className="block textbox mt-1 w-full cursor-pointer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            title={formik.values.collectionLocation || ''}
            value={formik.values.collectionLocation || ''}
            onClick={onBrowseCollection}
          />
          {loadError || (formik.touched.collectionLocation && formik.errors.collectionLocation) ? (
            <div className="text-red-500 break-words">{loadError || formik.errors.collectionLocation}</div>
          ) : null}

          {formik.values.collectionLocation ? (
            <div className="mt-1">
              <span className="text-link cursor-pointer hover:underline" onClick={onBrowseCollection}>
                Browse
              </span>
            </div>
          ) : null}
        </>
      )}

      {environmentNames.length ? (
        <>
          <label htmlFor="api-spec-environment" className="flex items-center font-semibold mt-3">
            Environment
          </label>
          <MenuDropdown
            items={environmentItems}
            selectedItemId={formik.values.environment}
            data-testid="api-spec-environment-dropdown"
            menuClassName="max-h-64 overflow-y-auto"
            placement="bottom-start"
            appendTo={() => document.body}
            popperOptions={{ strategy: 'fixed' }}
            offset={[0, 0]}
            sameWidth
          >
            <button
              type="button"
              id="api-spec-environment"
              className="collection-select-trigger flex items-center justify-between cursor-pointer mt-2 w-full"
              data-testid="api-spec-environment-trigger"
            >
              <span className="truncate">{formik.values.environment}</span>
              <IconChevronDown className="caret" size={14} strokeWidth={2} />
            </button>
          </MenuDropdown>
        </>
      ) : null}
    </>
  );
};

export default CollectionSourceFields;
