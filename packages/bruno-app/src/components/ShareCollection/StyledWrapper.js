import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs {
    .tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: ${(props) => props.theme.colors.text.subtext0};
      cursor: pointer;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &.active {
        font-weight: ${(props) => props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }
    }
  }

  .section-title {
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.subtext0};
    margin-bottom: 0.75rem;
  }

  .opencollection-link {
    color: ${(props) => props.theme.textLink};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  .bruno-format-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .format-card {
    display: flex;
    flex-direction: column;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 1rem;
    border: 2px solid ${(props) => props.theme.border.border0};
    background-color: ${(props) => props.theme.background.base};
    cursor: pointer;
    transition: border-color 0.15s ease;
    min-height: 180px;

    &:hover:not(.selected) {
      border-color: ${(props) => props.theme.border.border2};
    }

    &.selected {
      border-color: ${(props) => props.theme.primary.solid};
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;

      .card-title {
        font-weight: 600;
        font-size: 0.9375rem;
      }

      .recommended-badge {
        padding: 0.125rem 0.5rem;
        font-size: 0.6875rem;
        font-weight: 600;
        border-radius: 0.25rem;
        background-color: ${(props) => props.theme.colors.text.warning};
        color: white;
      }
    }

    .card-description {
      font-size: 0.8125rem;
      color: ${(props) => props.theme.colors.text.subtext0};
      margin-bottom: 0.75rem;
    }

    .feature-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-size: 0.8125rem;
        color: ${(props) => props.theme.colors.text.subtext0};

        .checkmark {
          color: ${(props) => props.theme.colors.text.subtext0};
          flex-shrink: 0;
          margin-top: 0.125rem;
        }
      }
    }

    .best-for {
      margin-top: 0.75rem;
      font-size: 0.75rem;
      font-style: italic;
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .other-format-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .other-format-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.75rem 1rem;
    border: 2px solid ${(props) => props.theme.border.border0};
    background-color: ${(props) => props.theme.background.base};
    cursor: pointer;
    transition: border-color 0.15s ease;

    &:hover:not(.selected) {
      border-color: ${(props) => props.theme.border.border2};
    }

    &.selected {
      border-color: ${(props) => props.theme.primary.solid};
    }

    .format-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .format-info {
      .format-name {
        font-weight: 600;
        font-size: 0.875rem;
      }

      .format-description {
        font-size: 0.75rem;
        color: ${(props) => props.theme.colors.text.subtext0};
      }
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid ${(props) => props.theme.border.border0};
  }
`;

export default StyledWrapper;
