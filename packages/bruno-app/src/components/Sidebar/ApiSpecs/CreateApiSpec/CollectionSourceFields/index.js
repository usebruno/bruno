import React from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import SegmentedControl from 'ui/SegmentedControl';
import { IconCaretDown, IconFolder } from '@tabler/icons';
import { COLLECTION_SOURCE, COLLECTION_SOURCE_ITEMS } from '../apiSpecSources';

const CollectionSourceFields = ({
  formik,
  workspaceCollections,
  selectedWorkspaceCollection,
  environmentNames,
  onSelectSource,
  onSelectCollection,
  onSelectEnvironment,
  onBrowseCollection
}) => {
  const isWorkspaceSource = formik.values.collectionSource === COLLECTION_SOURCE.WORKSPACE;

  const collectionItems = workspaceCollections.map((collection) => ({
    id: collection.uid,
    label: collection.name,
    testId: `api-spec-collection-option-${collection.uid}`,
    onClick: () => onSelectCollection(collection.uid)
  }));

  const environmentItems = environmentNames.map((environmentName) => ({
    id: environmentName,
    label: environmentName,
    testId: `api-spec-environment-option-${environmentName}`,
    onClick: () => onSelectEnvironment(environmentName)
  }));

  return (
    <>
      <div className="mt-2">
        <SegmentedControl
          ariaLabel="Collection source"
          name="collectionSource"
          value={formik.values.collectionSource}
          onChange={onSelectSource}
          items={COLLECTION_SOURCE_ITEMS}
          size="sm"
          data-testid="api-spec-collection-source"
        />
      </div>

      {isWorkspaceSource ? (
        <>
          {workspaceCollections.length ? (
            <>
              <MenuDropdown
                items={collectionItems}
                selectedItemId={formik.values.collectionUid}
                data-testid="api-spec-collection-dropdown"
                menuClassName="max-h-64 overflow-y-auto"
                placement="bottom-start"
                appendTo={() => document.body}
                popperOptions={{ strategy: 'fixed' }}
                sameWidth
              >
                <button
                  type="button"
                  id="collection-select"
                  className="collection-select-trigger flex items-center justify-between cursor-pointer mt-2 w-full"
                  data-testid="api-spec-collection-trigger"
                >
                  <span className={selectedWorkspaceCollection ? 'truncate' : 'truncate placeholder'}>
                    {selectedWorkspaceCollection?.name || 'Select a collection'}
                  </span>
                  <IconCaretDown className="caret" size={14} strokeWidth={2} />
                </button>
              </MenuDropdown>
              {formik.touched.collectionUid && formik.errors.collectionUid ? (
                <div className="text-red-500">{formik.errors.collectionUid}</div>
              ) : null}
            </>
          ) : (
            <div className="text-xs mt-2 opacity-70" data-testid="api-spec-no-collections">
              No collections in this workspace. Pick "From file system" to choose a collection folder.
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative mt-2">
            {formik.values.collectionLocation ? (
              <span className="input-icon">
                <IconFolder size={14} strokeWidth={1.5} />
              </span>
            ) : null}
            <input
              id="collection-location"
              type="text"
              name="collectionLocation"
              readOnly={true}
              placeholder="Choose file..."
              className={`block textbox w-full cursor-pointer ${formik.values.collectionLocation ? '!pl-9' : ''}`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              title={formik.values.collectionLocation || ''}
              value={formik.values.collectionLocation || ''}
              onClick={onBrowseCollection}
            />
          </div>
          {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
            <div className="text-red-500">{formik.errors.collectionLocation}</div>
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
            sameWidth
          >
            <button
              type="button"
              id="api-spec-environment"
              className="collection-select-trigger flex items-center justify-between cursor-pointer mt-2 w-full"
              data-testid="api-spec-environment-trigger"
            >
              <span className="truncate">{formik.values.environment}</span>
              <IconCaretDown className="caret" size={14} strokeWidth={2} />
            </button>
          </MenuDropdown>
        </>
      ) : null}
    </>
  );
};

export default CollectionSourceFields;
