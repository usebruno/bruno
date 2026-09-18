import { useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { IconTag } from '@tabler/icons';
import { addFolderTag, deleteFolderTag } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import TagList from 'components/TagList/index';
import { getUniqueTagsFromItems, getInheritedTagsWithSource, findDescendantFolderWithTag } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const Settings = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const tags = folder.draft ? get(folder, 'draft.tags', []) : get(folder, 'root.tags', []);
  // suggest only tags used by requests inside this folder, not the whole collection
  const folderTags = getUniqueTagsFromItems(folder.items);
  const tagsHintList = folderTags.filter((tag) => !tags.includes(tag));

  const handleAdd = useCallback((tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      dispatch(
        addFolderTag({
          tag: trimmedTag,
          folderUid: folder.uid,
          collectionUid: collection.uid
        })
      );
    }
  }, [dispatch, tags, folder.uid, collection.uid]);

  const handleRemove = useCallback((tag) => {
    dispatch(
      deleteFolderTag({
        tag,
        folderUid: folder.uid,
        collectionUid: collection.uid
      })
    );
  }, [dispatch, folder.uid, collection.uid]);

  // a tag on an ancestor already applies here, and one on a descendant would become redundant
  const handleValidation = (tag) => {
    const trimmedTag = tag.trim();
    const inherited = getInheritedTagsWithSource(collection, folder).find((entry) => entry.tag === trimmedTag);
    if (inherited) {
      return `Tag "${trimmedTag}" already exists on parent folder "${inherited.folderName}"`;
    }
    const descendant = findDescendantFolderWithTag(folder.items, trimmedTag);
    if (descendant) {
      return `Tag "${trimmedTag}" already exists on child folder "${descendant.name}"`;
    }
    return '';
  };

  const onSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  return (
    <StyledWrapper className="w-full h-full flex flex-col" data-testid="folder-settings-panel">
      <div className="bruno-form">
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 mb-4">
            <IconTag size={16} />
            Tags
          </h3>
          <TagList
            tagsHintList={tagsHintList}
            handleAddTag={handleAdd}
            handleRemoveTag={handleRemove}
            tags={tags}
            onSave={onSave}
            handleValidation={handleValidation}
            collectionFormat={collection.format}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Settings;
