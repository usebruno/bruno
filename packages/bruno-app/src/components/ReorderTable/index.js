import React, { useEffect, useRef, useState, useMemo } from 'react';
import { IconGripVertical, IconMinusVertical } from '@tabler/icons';

/**
 * ReorderTable Component
 *
 * A table component that allows rows to be reordered via drag-and-drop.
 *
 * @param {Object} props - The component props
 * @param {React.ReactNode[]} props.children - The table rows as children
 * @param {function} props.updateReorderedItem - Callback function to handle reordered rows
 */

const ReorderTable = ({ children, updateReorderedItem }) => {
  const tbodyRef = useRef();
  const [hoveredRow, setHoveredRow] = useState(null);
  const [dragStart, setDragStart] = useState(null);

  const rowsOrder = useMemo(() => React.Children.toArray(children), [children]);

  /**
   * useEffect hook to handle row hover states
   */
  useEffect(() => {
    handleRowHover(null, false);
  }, [children]);

  const handleRowHover = (index, hoverstatus = true) => {
    setHoveredRow(hoverstatus ? index : null);
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setDragStart(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    handleRowHover(index);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== toIndex) {
      const updatedRowsOrder = [...rowsOrder];
      const [movedRow] = updatedRowsOrder.splice(fromIndex, 1);
      updatedRowsOrder.splice(toIndex, 0, movedRow);

      updateReorderedItem({
        updateReorderedItem: updatedRowsOrder.map((row) => row.props['data-uid'])
      });

      setTimeout(() => {
        handleRowHover(toIndex);
      }, 0);
    }
  };

  return (
    <tbody ref={tbodyRef}>
      {rowsOrder.map((row, index) => (
        <tr
          key={row.props['data-uid']}
          data-uid={row.props['data-uid']}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onMouseEnter={() => handleRowHover(index)}
          onMouseLeave={() => handleRowHover(index, false)}
        >
          {React.Children.map(row.props.children, (child, childIndex) => {
            if (childIndex === 0) {
              return React.cloneElement(child, {
                children: (
                  <>
                    <div
                      draggable
                      className="group drag-handle absolute z-10 left-[-17px] p-3.5 py-3.5 px-2.5 top-[3px] cursor-grab"
                    >
                      {hoveredRow === index && (
                        <>
                          <IconGripVertical
                            size={14}
                            className="z-10 icon-grip rounded-md absolute hidden group-hover:block"
                          />
                          <IconMinusVertical
                            size={14}
                            className="z-10 icon-minus rounded-md absolute block group-hover:hidden"
                          />
                        </>
                      )}
                    </div>
                    {child.props.children}
                  </>
                )
              });
            } else {
              return child;
            }
          })}
        </tr>
      ))}
    </tbody>
  );
};

export default ReorderTable;
