import React, { useRef, useEffect, useState, useCallback } from 'react';
import range from 'lodash/range';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { IconSettings } from '@tabler/icons';
import toast from 'react-hot-toast';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import InlineTypeChip, { TYPE_OPTIONS } from 'components/Sidebar/InlineTypeChip';
import { createRequest } from 'utils/collections/emptyStateRequest';
import { generateUniqueRequestName, flattenItems } from 'utils/collections';
import { formatIpcError } from 'utils/common/error';
import StyledWrapper from './StyledWrapper';

const DEFAULT_TYPE = TYPE_OPTIONS[0].id;

const InlineRequestCreator = ({ collection, parentItemUid = null, depth = 0, onDone }) => {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const dispatch = useDispatch();
  const { dropdownContainerRef } = useSidebarAccordion();
  const presetType
    = get(collection, 'draft.brunoConfig.presets.requestType')
      || get(collection, 'brunoConfig.presets.requestType');
  const initialType = TYPE_OPTIONS.some((o) => o.id === presetType) ? presetType : DEFAULT_TYPE;
  const [requestType, setRequestType] = useState(initialType);
  const [isCommitting, setIsCommitting] = useState(false);
  const [pendingPathname, setPendingPathname] = useState(null);
  const [committedName, setCommittedName] = useState('');
  const closingRef = useRef(false);

  // After commit, keep the row visible until the new item appears in collection state
  // (file watcher) to avoid a flicker. Fallback timeout closes the row regardless.
  const itemAppeared = useSelector((state) => {
    if (!pendingPathname) return false;
    const c = state.collections.collections.find((col) => col.uid === collection.uid);
    if (!c) return false;
    return flattenItems(c.items).some((i) => i.pathname === pendingPathname);
  });

  useEffect(() => {
    let cancelled = false;
    generateUniqueRequestName(collection, 'Untitled', parentItemUid)
      .then((name) => {
        if (cancelled || !inputRef.current) return;
        inputRef.current.value = name;
        inputRef.current.focus();
        inputRef.current.select();
      })
      .catch(() => {
        if (cancelled || !inputRef.current) return;
        inputRef.current.value = 'Untitled';
        inputRef.current.focus();
        inputRef.current.select();
      });
    return () => {
      cancelled = true;
    };
  }, [collection, parentItemUid]);

  const finish = useCallback(
    (openAdvanced = false) => {
      if (closingRef.current) return;
      closingRef.current = true;
      onDone({ openAdvanced });
    },
    [onDone]
  );

  const commit = useCallback(async () => {
    if (isCommitting || closingRef.current) return;
    const name = inputRef.current?.value?.trim();
    if (!name) {
      finish();
      return;
    }
    setIsCommitting(true);
    setCommittedName(name);
    try {
      const pathname = await createRequest({
        dispatch,
        collection,
        itemUid: parentItemUid,
        requestType,
        requestName: name
      });
      if (pathname) {
        setPendingPathname(pathname);
      } else {
        finish();
      }
    } catch (err) {
      toast.error(formatIpcError(err) || 'Failed to create request');
      setIsCommitting(false);
      setCommittedName('');
    }
  }, [collection, parentItemUid, requestType, isCommitting, dispatch, finish]);

  useEffect(() => {
    if (pendingPathname && itemAppeared) {
      finish();
    }
  }, [pendingPathname, itemAppeared, finish]);

  useEffect(() => {
    if (!pendingPathname) return;
    const t = setTimeout(() => finish(), 3000);
    return () => clearTimeout(t);
  }, [pendingPathname, finish]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target)) return;
      // Allow clicks inside MenuDropdown portals (type dropdown menu items)
      if (e.target.closest('[role="menu"]')) return;
      commit();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commit]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    }
  };

  const handleCogClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    finish(true);
  };

  const handleTypeChange = (id) => {
    setRequestType(id);
    inputRef.current?.focus();
  };

  return (
    <StyledWrapper depth={depth} ref={containerRef}>
      {range(depth).map((i) => (
        <div className="indent-block" key={i} style={{ width: 16, minWidth: 16, height: '100%' }}>
          &nbsp;
        </div>
      ))}
      <div className={`inline-request-creator-wrapper${pendingPathname ? ' is-pending' : ''}`}>
        <InlineTypeChip
          value={requestType}
          onChange={handleTypeChange}
          appendTo={dropdownContainerRef?.current || document.body}
        />
        {pendingPathname ? (
          <span className="inline-request-creator-pending-name" data-testid="inline-request-creator-pending-name">
            {committedName}
          </span>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              className="inline-request-creator-input"
              defaultValue=""
              placeholder="Request name"
              onKeyDown={handleKeyDown}
              onFocus={(e) => e.stopPropagation()}
              onBlur={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              readOnly={isCommitting}
              aria-label="New request name"
              data-testid="inline-request-creator-input"
            />
            <button
              type="button"
              className="inline-request-creator-cog"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCogClick}
              title="Advanced options"
              data-testid="inline-request-creator-cog"
            >
              <IconSettings size={13} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </StyledWrapper>
  );
};

export default InlineRequestCreator;
