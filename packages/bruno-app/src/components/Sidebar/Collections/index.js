import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { IconCheck, IconX } from '@tabler/icons';
import Collection from './Collection';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import { normalizePath } from 'utils/common/path';
import { isScratchCollection } from 'utils/collections';

const Collections = ({ showSearch, isCreatingInline, inlineCreationProps, onCreateClick }) => {
  const [searchText, setSearchText] = useState('');
  const { collections } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');

  const workspaceCollections = useMemo(() => {
    if (!activeWorkspace) return [];

    return collections.filter((c) => {
      if (isScratchCollection(c, workspaces)) {
        return false;
      }
      return activeWorkspace.collections?.some((wc) => normalizePath(wc.path) === normalizePath(c.pathname));
    });
  }, [activeWorkspace, collections, workspaces]);

  const inlineInput = isCreatingInline ? (
    <div className="inline-collection-create" ref={inlineCreationProps.containerRef}>
      <input
        ref={inlineCreationProps.inputRef}
        type="text"
        className="collection-name-input"
        value={inlineCreationProps.name}
        onChange={inlineCreationProps.onNameChange}
        onKeyDown={inlineCreationProps.onKeyDown}
        placeholder="Collection name..."
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <div className="inline-actions">
        <button
          className="inline-action-btn save"
          onClick={inlineCreationProps.onSave}
          onMouseDown={(e) => e.preventDefault()}
          title="Save"
        >
          <IconCheck size={14} strokeWidth={2} />
        </button>
        <button
          className="inline-action-btn cancel"
          onClick={inlineCreationProps.onCancel}
          onMouseDown={(e) => e.preventDefault()}
          title="Cancel"
        >
          <IconX size={14} strokeWidth={2} />
        </button>
      </div>
      {inlineCreationProps.error && (
        <div className="inline-create-error">{inlineCreationProps.error}</div>
      )}
    </div>
  ) : null;

  if (!workspaceCollections || !workspaceCollections.length) {
    return (
      <StyledWrapper>
        {inlineInput}
        <CreateOrOpenCollection onCreateClick={onCreateClick} />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper data-testid="collections">
      {showSearch && (
        <CollectionSearch searchText={searchText} setSearchText={setSearchText} />
      )}

      <div className="collections-list">
        {inlineInput}
        {workspaceCollections && workspaceCollections.length
          ? workspaceCollections.map((c) => {
              return (
                <Collection searchText={searchText} collection={c} key={c.uid} />
              );
            })
          : null}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
