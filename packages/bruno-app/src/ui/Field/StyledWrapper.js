import styled, { css } from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

  .field-label {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }


  .field-label.is-required::after {
    content: '*';
    margin-left: 0.125rem;
    color: ${(props) => props.theme.status.danger.text};
  }

  .field-helper {
    margin-top: 0.25rem;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  ${(props) =>
    props.$error
    && css`
      .field-helper {
        color: ${props.theme.status.danger.text};
      }
    `}
`;

export default StyledWrapper;
