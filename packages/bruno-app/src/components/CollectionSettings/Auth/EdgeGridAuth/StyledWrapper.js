import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  label {
    display: flex;
    align-items: center;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.subtext1};
    margin-bottom: 0.5rem;
  }

  .single-line-editor-wrapper {
    display: flex;
    align-items: center;
    max-width: 400px;
    margin-bottom: 0.5rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    &:focus-within {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
    }
  }

  .advanced-settings-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    margin: 1rem 0 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.subtext1};
    user-select: none;

    .advanced-settings-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.375rem 0.625rem;
      border-radius: 0.375rem;
      background-color: ${(props) => rgba(props.theme.primary.solid, 0.1)};

      svg {
        color: ${(props) => props.theme.primary.text};
      }
    }
  }

  .advanced-settings-hint {
    margin: -0.25rem 0 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: rgb(107 114 128);
  }

  .field-info {
    position: relative;
    display: inline-flex;
    align-items: center;
    margin-left: 6px;
    cursor: pointer;

    svg {
      color: rgb(107 114 128);
    }

    .field-tooltip {
      position: absolute;
      left: 0;
      bottom: 100%;
      z-index: 10;
      width: max-content;
      max-width: 15rem;
      margin-bottom: 0.25rem;
      padding: 0.5rem;
      border-radius: 0.375rem;
      background-color: #374151;
      color: #fff;
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 400;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    &:hover .field-tooltip {
      opacity: 1;
    }
  }
`;

export default StyledWrapper;
