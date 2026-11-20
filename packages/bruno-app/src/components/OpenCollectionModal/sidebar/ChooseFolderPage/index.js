import { useMemo } from 'react';
import get from 'lodash/get';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { IconFolder } from '@tabler/icons';
import {
  cancelCollectionSearch,
  closeOpenCollectionModal,
  openCollectionsFromModal,
  pickCollectionFolders,
  saveAutoOpenFolderPicker
} from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { selectOpenCollectionPathKeys } from 'providers/ReduxStore/slices/open-collection-modal/selectors';
import BusyOverlay from '../../components/BusyOverlay';
import CollectionPicker from '../../components/CollectionPicker';
import DropZone from '../../components/DropZone';
import { focusWhenFocusIsLost } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const ChooseFolderPage = () => {
  const dispatch = useDispatch();
  const autoOpenFolderPicker = useSelector((state) => get(state.app.preferences, 'openCollection.autoOpenFolderPicker', true));
  const { status, searchLabel, result } = useSelector((state) => state.openCollectionModal.chooseFolder);
  const openPathKeyList = useSelector(selectOpenCollectionPathKeys, shallowEqual);
  const openPathKeys = useMemo(() => new Set(openPathKeyList), [openPathKeyList]);

  const pickFolders = () => dispatch(pickCollectionFolders());
  const isSearching = status === 'searching';

  return (
    <StyledWrapper>
      <div className="choose-folder-content" inert={isSearching}>
        {result?.type === 'list' ? (
          <CollectionPicker
            key={result.id}
            collections={result.collections}
            folders={result.folders}
            initialSelection={result.preselect}
            openPathKeys={openPathKeys}
            testIdPrefix="choose-folder"
            onOpen={(paths) => dispatch(openCollectionsFromModal(paths))}
            onCancel={() => dispatch(closeOpenCollectionModal())}
            onChooseOtherFolders={pickFolders}
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
            <label className="choose-folder-auto-open">
              <input
                type="checkbox"
                checked={autoOpenFolderPicker}
                onChange={(event) => dispatch(saveAutoOpenFolderPicker(event.target.checked))}
                data-testid="choose-folder-auto-open-picker"
              />
              Open the folder picker when this tab opens
            </label>
          </div>
        )}
      </div>

      {isSearching ? (
        <BusyOverlay onCancel={() => dispatch(cancelCollectionSearch())}>
          Looking for collections in {searchLabel}…
        </BusyOverlay>
      ) : null}
    </StyledWrapper>
  );
};

export default ChooseFolderPage;
