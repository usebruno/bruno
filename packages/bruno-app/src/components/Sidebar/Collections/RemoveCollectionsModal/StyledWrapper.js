import styled from 'styled-components';

const StyledWrapper = styled.div`
  .collections-preview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 4px;
  }

  .collections-list-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .collections-list-scrollable {
    height: 160px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .collections-list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 4px;
  }

  .collection-tag {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    background-color: ${(props) => props.theme.requestTabs.active.bg};
    border: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .show-more-link,
  .show-less-link {
    margin-top: 4px;
    background: none;
    border: none;
    color: ${(props) => props.theme.colors.primary || props.theme.colors.text.link};
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 0;
    text-align: left;
    width: fit-content;
    display: inline-block;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.colors.primary || props.theme.colors.text.link};
      outline-offset: 2px;
      border-radius: 2px;
    }
  }
`;

export default StyledWrapper;
