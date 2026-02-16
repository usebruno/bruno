import styled from 'styled-components';

const Wrapper = styled.div`
  .current-environment {
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.25rem 0.3rem 0.25rem 0.5rem;
    user-select: none;
    background-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.bg};
    border: 1px solid ${(props) => props.theme.app.collection.toolbar.environmentSelector.border};
    line-height: 1rem;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.hoverBorder};
      background-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.hoverBg};
    }

    .caret {
      margin-left: 0.25rem;
      color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.caret};
      fill: ${(props) => props.theme.app.collection.toolbar.environmentSelector.caret};
      align-self: center;
    }

    .env-icon {
      margin-right: 0.25rem;
      color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.icon};
    }

    .env-text {
      color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.text};
      display: block;
    }

    .env-separator {
      background-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.separator};
    }

    .env-text-inactive {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: ${(props) => props.theme.font.size.sm};
    }

    &.no-environments {
      color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.noEnvironment.text};
      background-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.noEnvironment.bg};
      border: 1px dashed ${(props) => props.theme.app.collection.toolbar.environmentSelector.noEnvironment.border};

      &:hover {
        border-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.noEnvironment.hoverBorder};
        background-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.noEnvironment.hoverBg};
      }
    }
  }

  .tippy-box {
    width: ${(props) => props.width}px;
    min-width: 12rem;
    max-width: 650px !important;
    min-height: 15.5rem;
    max-height: 75vh;
    font-size: ${(props) => props.theme.font.size.base};
    position: relative;
    overflow: hidden;
  }

  .configure-button {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: ${(props) => props.theme.dropdown.bg};
    border-top: 0.0625rem solid ${(props) => props.theme.dropdown.separator};
    z-index: 10;
    margin: 0;
    
    &:hover {
      background-color: ${(props) => props.theme.dropdown.bg + ' !important'};
    }

    button {
      color: ${(props) => props.theme.text};
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 0.5rem;
    }
  }

  .tab-button {
    color: ${(props) => props.theme.colors.text.subtext0};
    font-size: ${(props) => props.theme.font.size.sm};

    .tab-content-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }

    &.active {
      color: ${(props) => props.theme.tabs.active.color};
      border-bottom-color: ${(props) => props.theme.tabs.active.border};
    }

    &.inactive {
      border-bottom-color: transparent;
    }
  }

  .tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .environment-list {
    flex: 1;
    overflow-y: auto;
    max-height: calc(75vh - 8rem); 
    padding-bottom: 2.625rem;
  }

  .dropdown-item-list {
    max-height: 75vh;
    overflow-y: scroll;
  }

  .empty-state {
    max-width: 20rem;
    margin: 0 auto;
    padding: 0.35rem 0.6rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 12.5rem;

    h3 {
      color: ${(props) => props.theme.text};
      font-size: 1rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }

    p {
      color: ${(props) => props.theme.text};
      opacity: 0.75;
      font-size: ${(props) => props.theme.font.size.xs};
      line-height: 1.5;
      margin-bottom: 1rem;
      max-width: 11.875rem;
      margin: 0 auto;
      margin-bottom: 1rem;
    }

    .space-y-2 {
      width: 100%;
      align-self: stretch;
    }

    .space-y-2 > button {
      border: 0.0625rem solid ${(props) => props.theme.text};
      background: transparent;
      color: ${(props) => props.theme.text};
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      width: 100%;
      margin-bottom: 0.5rem;
      font-size: ${(props) => props.theme.font.size.sm};
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;

      &:hover {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .no-collection-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
    text-align: center;
    opacity: 0.75;

    svg {
      margin: 0 auto 1rem auto;
      color: ${(props) => props.theme.text};
      opacity: 0.5;
    }
  }
`;

export default Wrapper;
