import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;

  &.var-value-compact .trailing-area {
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
  }

  &.var-value-compact .type-selector-overlay {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    background: ${(props) => props.theme.bg};
    padding: 0 4px;
    border-radius: 4px;
    z-index: 1;
  }

  &.var-value-compact .trailing-area .type-selector-overlay {
    right: 100%;
    margin-right: 0px;
  }

  &.var-value-compact > .type-selector-overlay {
    right: 0;
  }

  &.var-value-compact:hover .type-selector-overlay {
    opacity: 1;
  }

  /* Always show if a type-error warning icon is present */
  &.var-value-compact .type-selector-overlay:has(.text-yellow-600) {
    opacity: 1;
  }
`;

export default StyledWrapper;
