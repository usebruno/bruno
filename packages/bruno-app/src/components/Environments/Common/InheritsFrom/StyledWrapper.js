import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 4px;

  .inherits-from-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 0.3rem;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 11px;
    line-height: 1.4;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .inherits-from-icon {
      color: ${(props) => props.theme.colors.text.yellow};
    }

    .inherits-from-name {
      color: ${(props) => props.theme.text};
      font-weight: 500;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

export default StyledWrapper;
