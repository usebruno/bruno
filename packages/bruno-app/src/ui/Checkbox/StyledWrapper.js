import styled from 'styled-components';
import { rgba } from 'polished';

const SIZES = {
  sm: { box: '14px', icon: '10px', gap: '0.375rem' },
  md: { box: '16px', icon: '12px', gap: '0.5rem' }
};

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: flex-start;
  gap: ${(props) => (SIZES[props.$size] || SIZES.md).gap};
  cursor: ${(props) => (props.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(props) => (props.$disabled ? 0.5 : 1)};
  flex-direction: ${(props) => (props.$labelPosition === 'left' ? 'row-reverse' : 'row')};

  .checkbox-box {
    position: relative;
    flex-shrink: 0;
    width: ${(props) => (SIZES[props.$size] || SIZES.md).box};
    height: ${(props) => (SIZES[props.$size] || SIZES.md).box};
  }

  .checkbox-input {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: 100%;
    margin: 0;
    border: 1.5px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => {
      const r = props.$radius;
      if (typeof r === 'number') return `${r}px`;
      if (r === 'md') return props.theme.border.radius.md;
      return props.theme.border.radius.sm;
    }};
    background: transparent;
    cursor: inherit;
    outline: none;
    transition: all 0.15s ease;

    &:checked {
      background-color: ${(props) => props.$color || props.theme.primary.solid};
      border-color: ${(props) => props.$color || props.theme.primary.solid};
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px ${(props) => rgba(props.$color || props.theme.primary.solid, 0.25)};
    }
  }

  .checkbox-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    display: none;
  }

  .checkbox-input:checked + .checkbox-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.$iconColor || props.theme.button2.color.primary.text};
  }

  /* Indeterminate state */
  .checkbox-input.checkbox-indeterminate {
    background-color: ${(props) => props.$color || props.theme.primary.solid};
    border-color: ${(props) => props.$color || props.theme.primary.solid};
  }

  .checkbox-input.checkbox-indeterminate + .checkbox-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.$iconColor || props.theme.button2.color.primary.text};
  }

  .checkbox-label-content {
    display: flex;
    flex-direction: column;
    user-select: none;
    padding-top: 1px;
  }

  .checkbox-label {
    font-size: ${(props) => props.theme.font.size[props.$size === 'sm' ? 'xs' : 'sm']};
    color: ${(props) => props.theme.colors.text.body};
    line-height: 1.4;
  }

  .checkbox-description {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin-top: 0.125rem;
  }

  .checkbox-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 0.25rem;
  }
`;

export default StyledWrapper;
