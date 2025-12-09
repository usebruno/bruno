import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin: 4px 10px 8px 10px;
  position: relative;

  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: ${(props) => props.theme.sidebar.muted};
    pointer-events: none;
  }

  input {
    width: 100%;
    height: 32px;
    padding: 0 32px 0 32px;
    font-size: 12px;
    color: ${(props) => props.theme.sidebar.color};
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    border: 1px solid transparent;
    border-radius: 6px;
    outline: none;
    transition: all 0.15s ease;

    &::placeholder {
      color: ${(props) => props.theme.sidebar.muted};
    }

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      border-color: ${(props) => props.theme.sidebar.muted}40;
    }

    &:focus {
      background: ${(props) => props.theme.sidebar.bg};
      border-color: ${(props) => props.theme.sidebar.muted}80;
    }
  }

  .clear-icon {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    color: ${(props) => props.theme.sidebar.muted};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.sidebar.color};
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }
`;

export default StyledWrapper;
