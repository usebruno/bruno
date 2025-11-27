import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 600px;
  overflow: hidden;
  box-sizing: border-box;

  .collections-list-container {
    width: 100%;
    max-height: 150px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 0;
    box-sizing: border-box;
  }

  .collections-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  .collection-tag {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background-color: ${(props) => props.theme.requestTabs.active.bg};
    border: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
    border-radius: 4px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-tag-text {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .show-more-link,
  .show-less-link {
    display: inline-flex;
    align-items: center;
    
    &:hover {
      span {
        text-decoration: underline;
      }
    }
  }
`;

export default StyledWrapper;
