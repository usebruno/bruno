import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding: 0.75rem;

  .advanced-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .advanced-chevron {
    color: ${(props) => props.theme.colors.text.subtext0};
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .advanced-toggle[aria-expanded='true'] .advanced-chevron {
    transform: rotate(90deg);
  }

  .advanced-label {
    color: ${(props) => props.theme.colors.text.subtext1};
    font-weight: 600;
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.25rem;
  }

  .advanced-collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;
  }

  .advanced-collapse.open {
    grid-template-rows: 1fr;
  }

  .advanced-collapse-inner {
    min-height: 0;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .advanced-chevron,
    .advanced-collapse {
      transition: none;
    }
  }

  .advanced-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-top: 1.5rem;
  }

  .adv-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.25rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    line-height: 1.25rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.subtext2};

    &.mb-0 {
      margin-bottom: 0;
    }
  }

  .adv-label-icon {
    opacity: 0.75;
  }

  .seg-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: 1.125rem;
  }

  .segmented {
    display: inline-flex;
    border: 1px solid ${(props) => props.theme.background.surface2};
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow: hidden;

    .seg {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 0.375rem;
      background-color: ${(props) => props.theme.background.base};
      border: none;
      cursor: pointer;
      font-size: ${(props) => props.theme.font.size.sm};
      font-weight: 400;
      color: ${(props) => props.theme.colors.text.subtext1};

      & + .seg {
        border-left: 1px solid ${(props) => props.theme.background.surface2};
      }

      &.active {
        background-color: ${(props) => props.theme.background.surface1};
        color: ${(props) => props.theme.text};
        font-weight: 500;
      }

    }
  }

  .seg-hint {
    display: inline-flex;
    align-items: center;
    cursor: help;
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .adv-hint-tooltip {
    max-width: 16rem;
  }

  .adv-tags {
    margin-top: 0.75rem;
    margin-left: 1.125rem;
  }

  .adv-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .adv-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
    cursor: pointer;

    .toggle-label {
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 500;
      line-height: 1.25rem;
      color: ${(props) => props.theme.text};
    }
  }

  .adv-desc {
    margin: 0 0 0 1.25rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.subtext2};
    line-height: 1.125rem;
  }
`;

export default StyledWrapper;
