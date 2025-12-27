import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow: hidden;

  .empty-state {
    color: ${(props) => props.theme.colors.text.muted};
    padding: 1rem;
  }

  .responses-container {
    height: 100%;

    &.single {
      height: 100%;
    }

    &.multi {
      overflow-y: auto;
    }
  }

  .messages-list {
    display: flex;
    flex-direction: column;
  }

  .message-item {
    display: flex;
    flex-direction: column;

    &:not(.last) {
      border-bottom: 1px solid ${(props) => props.theme.border.border1};
    }
  }

  .message-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    cursor: pointer;
    user-select: none;

    &:hover {
      .toggle-btn {
        color: ${(props) => props.theme.text};
      }
    }
  }

  .message-label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .latest-badge {
    margin-left: 8px;
    padding: 2px 6px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.green};
    background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 10%, transparent);
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.colors.text.muted};
    transition: color 0.15s ease;
  }

  .message-content {
    height: 240px;
    margin-bottom: 8px;
  }
`;

export default StyledWrapper;
