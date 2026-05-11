import React, { useLayoutEffect, useRef, useState } from 'react';
import { IconUpload, IconX, IconFile, IconChevronDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import path, { normalizePath } from 'utils/common/path';
import Wrapper, { OverflowList } from './StyledWrapper';

const basename = (filePath) => (filePath ? path.basename(normalizePath(String(filePath))) : '');

// Keep in sync with the corresponding CSS values in StyledWrapper.js:
//   MIN_CHIP_W  ↔ .file-chip { min-width: 75px }
//   CHIP_GAP    ↔ .file-chips-row { gap: 4px }
const MIN_CHIP_W = 75;
const CHIP_GAP = 4;
const UPLOAD_RESERVE = 28;
const MORE_CHIP_RESERVE = 56;

const MultipartFileChipsCell = ({ files, onRemove, onAdd, editMode = true }) => {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(files.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Measure the td (column-width, stable) rather than the content-sized cell,
    // which would feed back on visibleCount.
    const td = container.closest('td') || container.parentElement;
    if (!td) return;

    const compute = () => {
      const tdStyle = window.getComputedStyle(td);
      const padX = parseFloat(tdStyle.paddingLeft) + parseFloat(tdStyle.paddingRight);
      const total = td.clientWidth - padX;
      if (files.length === 0) {
        setVisibleCount(0);
        return;
      }

      const allAtMin = files.length * MIN_CHIP_W + Math.max(0, files.length - 1) * CHIP_GAP;
      if (allAtMin + UPLOAD_RESERVE <= total) {
        setVisibleCount(files.length);
        return;
      }

      const available = total - UPLOAD_RESERVE - MORE_CHIP_RESERVE;
      const n = Math.max(0, Math.floor((available + CHIP_GAP) / (MIN_CHIP_W + CHIP_GAP)));
      setVisibleCount(n);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(td);
    return () => ro.disconnect();
  }, [files]);

  const visible = files.slice(0, visibleCount);
  const overflow = files.slice(visibleCount);
  const collapsed = visibleCount === 0 && files.length > 0;

  const renderChip = (filePath, idx) => (
    <div
      key={`${filePath}-${idx}`}
      data-testid="multipart-file-chip"
      className="file-chip"
      title={filePath}
    >
      <IconFile size={14} stroke={1.5} className="file-chip-icon" />
      <span className="file-chip-name">{basename(filePath)}</span>
      {editMode && (
        <button
          type="button"
          data-testid="multipart-file-chip-remove"
          className="file-chip-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(filePath);
          }}
          title="Remove file"
        >
          <IconX size={13} stroke={1.5} />
        </button>
      )}
    </div>
  );

  const renderOverflowList = (list) => (
    <OverflowList>
      {list.map((p, i) => (
        <div
          key={`o-${p}-${i}`}
          data-testid="multipart-file-overflow-row"
          className="overflow-row"
          title={p}
        >
          <IconFile size={14} stroke={1.5} className="overflow-row-icon" />
          <span className="overflow-row-name">{basename(p)}</span>
          {editMode && (
            <button
              type="button"
              data-testid="multipart-file-overflow-remove"
              className="overflow-row-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(p);
              }}
              title="Remove file"
            >
              <IconX size={13} stroke={1.5} />
            </button>
          )}
        </div>
      ))}
    </OverflowList>
  );

  return (
    <Wrapper className="file-value-cell" ref={containerRef}>
      {collapsed ? (
        <>
          <Dropdown
            placement="bottom-start"
            appendTo={() => document.body}
            icon={(
              <button
                type="button"
                data-testid="multipart-file-summary"
                className="file-summary-chip"
                onClick={(e) => e.stopPropagation()}
                title={`${files.length} file${files.length > 1 ? 's' : ''}`}
              >
                <IconFile size={14} stroke={1.5} className="file-chip-icon" />
                <span>{files.length} file{files.length > 1 ? 's' : ''}</span>
                <IconChevronDown size={14} stroke={1.5} />
              </button>
            )}
          >
            {renderOverflowList(files)}
          </Dropdown>

        </>
      ) : (
        <>
          <div className="file-chips-row">
            {visible.map((p, i) => renderChip(p, i))}
          </div>
          {overflow.length > 0 && (
            <Dropdown
              placement="bottom-end"
              appendTo={() => document.body}
              icon={(
                <button
                  type="button"
                  data-testid="multipart-file-more"
                  className="file-more-chip"
                  onClick={(e) => e.stopPropagation()}
                  title={`${overflow.length} more file${overflow.length > 1 ? 's' : ''}`}
                >
                  +{overflow.length} more
                </button>
              )}
            >
              {renderOverflowList(overflow)}
            </Dropdown>
          )}
        </>
      )}
      {editMode && (
        <button
          type="button"
          data-testid="multipart-file-upload"
          className="upload-btn ml-1"
          onClick={onAdd}
          title="Add files"
        >
          <IconUpload size={16} />
        </button>
      )}
    </Wrapper>
  );
};

export default MultipartFileChipsCell;
