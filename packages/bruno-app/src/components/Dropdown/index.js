import React from 'react';
import Tippy from '@tippyjs/react';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Dropdown = ({ icon, children, onCreate, placement, transparent, visible, ...props }) => {
  const { theme } = useTheme();

  const handleMount = (instance) => {
    if (onCreate) {
      onCreate(instance);
    }
  };

  const handleShow = (instance) => {
    // Ensure the dropdown has proper styling when appended to body
    // Apply styles every time the dropdown is shown
    const popper = instance.popper;
    if (popper && theme) {
      // Find the .tippy-box element inside the popper
      const tippyBox = popper.querySelector('.tippy-box');
      if (tippyBox) {
        // Apply all necessary styles to the box
        tippyBox.style.position = 'absolute';
        tippyBox.style.zIndex = '9999';
        tippyBox.style.opacity = '1';
        tippyBox.style.minWidth = '135px';
        tippyBox.style.width = 'auto';
        tippyBox.style.fontSize = '0.8125rem';
        tippyBox.style.borderRadius = '3px';
        tippyBox.style.maxHeight = '90vh';
        tippyBox.style.overflowY = 'auto';
        tippyBox.style.maxWidth = 'unset';
        
        if (theme.dropdown?.bg) {
          tippyBox.style.backgroundColor = theme.dropdown.bg;
        }
        if (theme.dropdown?.color) {
          tippyBox.style.color = theme.dropdown.color;
        }
        if (theme.dropdown?.shadow) {
          tippyBox.style.boxShadow = theme.dropdown.shadow;
        }

        // Style the content area
        const tippyContent = tippyBox.querySelector('.tippy-content');
        if (tippyContent) {
          tippyContent.style.paddingLeft = '0';
          tippyContent.style.paddingRight = '0';
          tippyContent.style.paddingTop = '0.25rem';
          tippyContent.style.paddingBottom = '0.25rem';
          tippyContent.style.width = '100%';
        }

        // Style all dropdown items
        const dropdownItems = tippyBox.querySelectorAll('.dropdown-item');
        dropdownItems.forEach((item) => {
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.padding = '0.35rem 0.6rem';
          item.style.cursor = 'pointer';
          item.style.width = '100%';
          item.style.boxSizing = 'border-box';
          if (theme.dropdown?.color) {
            item.style.color = theme.dropdown.color;
          }
        });

        // Also handle label items
        const labelItems = tippyBox.querySelectorAll('.label-item');
        labelItems.forEach((item) => {
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.padding = '0.35rem 0.6rem';
          if (theme.dropdown?.labelBg) {
            item.style.backgroundColor = theme.dropdown.labelBg;
          }
        });
      }
    }
  };

  // When in controlled mode (visible prop is provided), don't use trigger prop
  const tippyProps = visible !== undefined
    ? { ...props, visible, interactive: true, appendTo: () => document.body, onMount: handleMount, onShow: handleShow }
    : { ...props, trigger: 'click', interactive: true, appendTo: () => document.body, onMount: handleMount, onShow: handleShow };

  return (
    <StyledWrapper className="dropdown" transparent={transparent}>
      <Tippy
        content={children}
        placement={placement || 'bottom-end'}
        animation={false}
        arrow={false}
        {...tippyProps}
      >
        {icon}
      </Tippy>
    </StyledWrapper>
  );
};

export default Dropdown;
