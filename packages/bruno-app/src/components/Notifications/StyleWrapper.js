import styled from 'styled-components';

const StyledWrapper = styled.div`
  .notifications-modal {
    margin-inline: -1rem;
    margin-block: -1.5rem;
    background-color: ${(props) => props.theme.notifications.bg};
  }

  .notification-count {
    display: flex;
    color: white;
    position: absolute;
    top: -0.625rem;
    right: -0.5rem;
    margin-right: 0.5rem;
    justify-content: center;
    font-size: 0.625rem;
    border-radius: 50%;
    background-color: ${(props) => props.theme.colors.text.yellow};
    border: solid 2px ${(props) => props.theme.sidebar.bg};
    min-width: 1.25rem;
  }

  button.mark-as-read {
    font-weight: 400 !important;
  }

  ul.notifications {
    background-color: ${(props) => props.theme.notifications.list.bg};
    border-right: solid 1px ${(props) => props.theme.notifications.list.borderRight};
    min-height: 400px;
    height: 100%;
    max-height: 85vh;
    overflow-y: auto;

    li {
      min-width: 150px;
      cursor: pointer;
      padding: 0.5rem 0.625rem;
      border-left: solid 2px transparent;
      color: ${(props) => props.theme.textLink};
      border-bottom: solid 1px ${(props) => props.theme.notifications.list.borderBottom};
      &:hover {
        background-color: ${(props) => props.theme.notifications.list.hoverBg};
      }

      &.active {
        color: ${(props) => props.theme.text} !important;
        background-color: ${(props) => props.theme.notifications.list.active.bg} !important;
        border-left: solid 2px ${(props) => props.theme.notifications.list.active.border};
        &:hover {
          background-color: ${(props) => props.theme.notifications.list.active.hoverBg} !important;
        }
      }

      &.read {
        color: ${(props) => props.theme.text} !important;
      }

      .notification-date {
        font-size: 0.6875rem;
      }
    }
  }

  .notification-title {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .notification-date {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .pagination {
    background-color: ${(props) => props.theme.notifications.list.bg};
    border-right: solid 1px ${(props) => props.theme.notifications.list.borderRight};
  }
`;

export default StyledWrapper;
