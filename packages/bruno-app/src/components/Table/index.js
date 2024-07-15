import { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';

const Table = ({ minColumnWidth = 1, headers = [], children }) => {
  const [tableHeight, setTableHeight] = useState('auto');
  const [activeColumnIndex, setActiveColumnIndex] = useState(null);
  const tableRef = useRef(null);

  const columns = headers?.map((item) => ({
    ...item,
    ref: useRef()
  }));

  useEffect(() => {
    if (tableRef.current) {
      setTableHeight(tableRef.current.offsetHeight);
    }
  }, []);

  const handleMouseDown = (index) => (e) => {
    setActiveColumnIndex(index);
  };

  const handleMouseMove = useCallback(
    (e) => {
      const gridColumns = columns.map((col, i) => {
        if (i === activeColumnIndex) {
          const width = e.clientX - col.ref?.current?.getBoundingClientRect()?.left;

          if (width >= minColumnWidth) {
            return `${width}px`;
          }
        }
        return `${col.ref.current.offsetWidth}px`;
      });

      tableRef.current.style.gridTemplateColumns = `${gridColumns.join(' ')}`;
    },
    [activeColumnIndex, columns, minColumnWidth]
  );

  const handleMouseUp = useCallback(() => {
    setActiveColumnIndex(null);
    removeListeners();
  }, [setActiveColumnIndex, removeListeners]);

  const removeListeners = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', removeListeners);
  }, [handleMouseMove]);

  useEffect(() => {
    if (activeColumnIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      removeListeners();
    };
  }, [activeColumnIndex, handleMouseMove, handleMouseUp, removeListeners]);

  return (
    <StyledWrapper columns={columns}>
      <div className="relative">
        <table ref={tableRef} className="px-4 inherit left-[4px]">
          <thead>
            <tr>
              {columns.map(({ ref, name }, i) => (
                <th ref={ref} key={name} title={name}>
                  <span>{name}</span>
                  <div
                    style={{ height: tableHeight }}
                    onMouseDown={handleMouseDown(i)}
                    className={`absolute cursor-col-resize w-[4px] right-[-2px] top-0 z-10 opacity-50 hover:bg-blue-500 active:bg-blue-500`}
                  ></div>
                </th>
              ))}
            </tr>
          </thead>
          {children}
        </table>
      </div>
    </StyledWrapper>
  );
};

export default Table;
