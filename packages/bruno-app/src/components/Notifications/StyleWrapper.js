import styled from 'styled-components';

const StyledWrapper = styled.div`
  .notifications-modal {
    margin-inline: -1rem;
    margin-block: -1.5rem;
    background-color: ${(props) => props.theme.notifications.settings.bg};
  }

  .notification-count {
    position: absolute;
    right: -10px;
    top: -15px;
    z-index: 10;
    margin-right: 0.5rem;
    background-color: ${(props) => props.theme.notifications.bell.count};
    border-radius: 50%;
    padding: 2px 1px;
    min-width: 20px;
    display: flex;
    justify-content: center;
    font-size: 10px;
  }

  .bell {
    animation: fade-and-pulse 1s ease-in-out 1s forwards;
  }

  ul {
    background-color: ${(props) => props.theme.notifications.settings.sidebar.bg};
    border-right: solid 1px ${(props) => props.theme.notifications.settings.sidebar.borderRight};
    min-height: 400px;
    height: 100%;
    max-height: 85vh;
    overflow-y: auto;
  }

  li {
    min-width: 150px;
    min-height: 5rem;
    display: block;
    position: relative;
    cursor: pointer;
    padding: 8px 10px;
    border-left: solid 2px transparent;
    border-bottom: solid 1px ${(props) => props.theme.notifications.settings.item.borderBottom};
    font-weight: 600;
    &:hover {
      background-color: ${(props) => props.theme.notifications.settings.item.hoverBg};
    }
  }

  .active {
    font-weight: normal;
    background-color: ${(props) => props.theme.notifications.settings.item.active.bg} !important;
    border-left: solid 2px ${(props) => props.theme.notifications.settings.item.border};
    &:hover {
      background-color: ${(props) => props.theme.notifications.settings.item.active.hoverBg} !important;
    }
  }

  .read {
    opacity: 0.7;
    font-weight: normal;
    background-color: ${(props) => props.theme.notifications.settings.item.read.bg} !important;
    &:hover {
      background-color: ${(props) => props.theme.notifications.settings.item.read.hoverBg} !important;
    }
  }

  .notification-title {
    // text ellipses 2 lines
    // white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .notification-date {
    color: ${(props) => props.theme.notifications.settings.item.date.color} !important;
  }

  .pagination {
    background-color: ${(props) => props.theme.notifications.settings.sidebar.bg};
    border-right: solid 1px ${(props) => props.theme.notifications.settings.sidebar.borderRight};
  }
`;

export default StyledWrapper;
