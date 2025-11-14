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
    max-height: calc((32px + 8px) * 4 + 8px); /* 4 rows: (tag height + gap) * 4 + padding */
    overflow-y: auto;
    overflow-x: hidden;
  }

  .collections-list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 4px;
    align-content: start;
    grid-auto-rows: min-content;
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
    height: 32px;
    box-sizing: border-box;
  }

  .show-more-link,
  .show-less-link {
    &:hover {
      span {
        text-decoration: underline;
      }
    }
  }
`;

export default StyledWrapper;
