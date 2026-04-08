import styled from 'styled-components';
import { INPUT_SIZES } from './constants';

const StyledWrapper = styled.div`
  position: relative;
  width: 100%;

  .input-wrapper-label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: ${(props) => props.theme.font.size[INPUT_SIZES[props.$size || 'md'].labelFontSize]};
    color: ${(props) => props.theme.colors.text.body};
  }

  .input-wrapper-required {
    color: ${(props) => props.theme.colors.text.danger};
    margin-left: 0.125rem;
  }

  .input-wrapper-description {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 0.25rem;
  }

  .input-wrapper-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 0.25rem;
  }
`;

export default StyledWrapper;
