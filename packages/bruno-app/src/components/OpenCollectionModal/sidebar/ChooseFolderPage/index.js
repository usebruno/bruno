import { useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { IconFolder } from '@tabler/icons';
import {
  cancelCollectionSearch,
  closeOpenCollectionModal,
  openCollectionsFromModal,
  pickCollectionFolders,
  switchToCollection
} from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { countOf } from 'providers/ReduxStore/slices/open-collection-modal/folder-results';
import { selectOpenCollectionPathKeys } from 'providers/ReduxStore/slices/open-collection-modal/selectors';
import useKeybindingDisplayText from 'hooks/useKeybindingDisplayText';
import BusyOverlay from '../../components/BusyOverlay';
import CollectionList from '../../components/CollectionList';
import DropZone from '../../components/DropZone';
import { focusWhenFocusIsLost } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const byPath = (a, b) => a.path.localeCompare(b.path);

const ChooseFolderPage = () => {
  const dispatch = useDispatch();
  const { status, searchLabel, result } = useSelector((state) => state.openCollectionModal.chooseFolder);
  const openPathKeyList = useSelector(selectOpenCollectionPathKeys, shallowEqual);
  const openPathKeys = useMemo(() => new Set(openPathKeyList), [openPathKeyList]);
  const chooseFolderShortcut = useKeybindingDisplayText()('openCollection');
  const foundCollections = useMemo(() => (result?.type === 'list' ? [...result.collections].sort(byPath) : []), [result]);

  const pickFolders = () => dispatch(pickCollectionFolders());
  const isSearching = status === 'searching';

  return (
    <StyledWrapper>
      <div className="choose-folder-content" inert={isSearching}>
        {result?.type === 'list' ? (
          <CollectionList
            key={result.id}
            collections={foundCollections}
            openPathKeys={openPathKeys}
            hiddenPathKeys={openPathKeys}
            initialSelectedPaths={result.preselect}
            searchPlaceholder={`Search ${countOf(foundCollections.length, 'collection')}`}
            autoFocusSearch={false}
            showSelectAll
            testIdPrefix="choose-folder"
            onOpen={(paths) => dispatch(openCollectionsFromModal(paths))}
            onSwitch={(collectionPath) => dispatch(switchToCollection(collectionPath))}
            onCancel={() => dispatch(closeOpenCollectionModal())}
          />
        ) : (
          <div className="choose-folder-start">
            <DropZone
              icon={IconFolder}
              title="Drop Bruno collection folders here"
              hint={(
                <>
                  Bruno Collection folder has <code>opencollection.yml</code> or <code>bruno.json</code> at the root
                </>
              )}
              shortcut={chooseFolderShortcut}
              data-testid="choose-folder-drop-zone"
            >
              Or{' '}
              <button
                ref={focusWhenFocusIsLost}
                type="button"
                className="text-link hover:underline whitespace-nowrap"
                onClick={pickFolders}
                data-testid="choose-folder-choose-link"
              >
                choose folders
              </button>
            </DropZone>
          </div>
        )}
      </div>

      {isSearching && (
        <BusyOverlay onCancel={() => dispatch(cancelCollectionSearch())}>
          Looking for collections in {searchLabel}…
        </BusyOverlay>
      )}
    </StyledWrapper>
  );
};

export default ChooseFolderPage;
