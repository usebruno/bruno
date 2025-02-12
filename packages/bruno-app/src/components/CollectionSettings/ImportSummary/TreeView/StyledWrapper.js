import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tree-container {
    // border: 1px solid ${(props) => props.theme.colors.border};
    border-radius: 4px;
    padding: 8px;
    // max-height: 400px;
    max-height: 844px;
    overflow-y: auto;
  }

  .tree-item {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    margin: 2px 0;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;

    &:hover {
    }

    .chevron {
      display: inline-flex;
      align-items: center;
      margin-right: 4px;
      transition: transform 0.2s ease;

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .count {
      margin-left: 6px;
      font-size: 12px;
      //   color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .request-item {
    cursor: default;

    .method-label {
      margin-left: auto;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      //   color: ${(props) => props.theme.colors.method.get.color};
      font-weight: 500;
    }
  }
`;

export default StyledWrapper;
