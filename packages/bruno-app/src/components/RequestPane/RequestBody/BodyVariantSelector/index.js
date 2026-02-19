import React, { useMemo, useCallback, useState } from 'react';
import get from 'lodash/get';
import { IconCaretDown, IconPlus, IconPencil, IconTrash } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import {
  addBodyVariant,
  switchBodyVariant,
  renameBodyVariant,
  deleteBodyVariant
} from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const BodyVariantSelector = ({ item, collection }) => {
  const dispatch = useDispatch();
  const [renamingUid, setRenamingUid] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const request = item.draft ? get(item, 'draft.request') : get(item, 'request');
  const bodyVariants = request?.bodyVariants || [];
  const activeBodyVariantUid = request?.activeBodyVariantUid;

  const activeVariant = bodyVariants.find((v) => v.uid === activeBodyVariantUid);

  const onAddVariant = useCallback(() => {
    dispatch(
      addBodyVariant({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  }, [dispatch, item.uid, collection.uid]);

  const onSwitchVariant = useCallback(
    (variantUid) => {
      dispatch(
        switchBodyVariant({
          itemUid: item.uid,
          collectionUid: collection.uid,
          variantUid
        })
      );
    },
    [dispatch, item.uid, collection.uid]
  );

  const onRenameVariant = useCallback(
    (variantUid, name) => {
      dispatch(
        renameBodyVariant({
          itemUid: item.uid,
          collectionUid: collection.uid,
          variantUid,
          name
        })
      );
      setRenamingUid(null);
      setRenameValue('');
    },
    [dispatch, item.uid, collection.uid]
  );

  const onDeleteVariant = useCallback(
    (variantUid) => {
      dispatch(
        deleteBodyVariant({
          itemUid: item.uid,
          collectionUid: collection.uid,
          variantUid
        })
      );
    },
    [dispatch, item.uid, collection.uid]
  );

  const handleRenameKeyDown = useCallback(
    (e, variantUid) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (renameValue.trim()) {
          onRenameVariant(variantUid, renameValue.trim());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setRenamingUid(null);
        setRenameValue('');
      }
    },
    [renameValue, onRenameVariant]
  );

  const menuItems = useMemo(() => {
    const items = bodyVariants.map((variant) => ({
      id: variant.uid,
      label: variant.name,
      onClick: () => onSwitchVariant(variant.uid),
      rightSection: (
        <div className="variant-actions" onClick={(e) => e.stopPropagation()}>
          <span
            className="variant-action-btn"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setRenamingUid(variant.uid);
              setRenameValue(variant.name);
            }}
          >
            <IconPencil size={14} strokeWidth={1.5} />
          </span>
          {bodyVariants.length > 2 && (
            <span
              className="variant-action-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteVariant(variant.uid);
              }}
            >
              <IconTrash size={14} strokeWidth={1.5} />
            </span>
          )}
        </div>
      )
    }));

    // Add separator and "Add Variant" option
    items.push({ type: 'divider', id: 'divider-add' });
    items.push({
      id: 'add-variant',
      label: 'Add Variant',
      leftSection: IconPlus,
      onClick: onAddVariant
    });

    return items;
  }, [bodyVariants, activeBodyVariantUid, onSwitchVariant, onAddVariant, onDeleteVariant]);

  // If no variants, show just a "+" button to create the first one
  if (bodyVariants.length === 0) {
    return (
      <StyledWrapper>
        <div
          className="add-variant-btn"
          onClick={onAddVariant}
          title="Add body variant"
        >
          <IconPlus size={16} strokeWidth={1.5} />
        </div>
      </StyledWrapper>
    );
  }

  // If renaming, show inline rename input
  if (renamingUid) {
    const variant = bodyVariants.find((v) => v.uid === renamingUid);
    return (
      <StyledWrapper>
        <input
          type="text"
          className="px-2 py-1 text-sm border rounded"
          style={{ width: '140px' }}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => handleRenameKeyDown(e, renamingUid)}
          onBlur={() => {
            if (renameValue.trim()) {
              onRenameVariant(renamingUid, renameValue.trim());
            } else {
              setRenamingUid(null);
              setRenameValue('');
            }
          }}
          autoFocus
          placeholder={variant?.name || 'Variant name'}
        />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer variant-selector">
        <MenuDropdown
          items={menuItems}
          placement="bottom-end"
          selectedItemId={activeBodyVariantUid}
          showTickMark={true}
          showGroupDividers={false}
        >
          <div className="flex items-center justify-center pl-3 py-1 select-none selected-variant">
            {activeVariant?.name || 'Default'}
            <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};

export default BodyVariantSelector;
