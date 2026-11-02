import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tags-field {
    max-width: 720px;

    /* Tag input: the SingleLineEditor root that wraps the editor */
    div:has(> [data-testid='tag-input']) {
      height: 34px;
      border-radius: 4px;
      border: 1px solid ${(props) => props.theme.input.border};
      background-color: ${(props) => props.theme.input.bg};
      transition: border-color ease-in-out 0.1s;

      &:focus-within {
        border-color: ${(props) => props.theme.input.focusBorder};
      }
    }
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 720px;
  }

  /* Settings that only apply when their parent toggle is on (e.g. Max Redirects under Follow Redirects) */
  .settings-subgroup {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* More breathing room between rows than the Preferences default (0.5rem) */
  .settings-group-body {
    gap: 1rem;
  }

  /* Tags heading styled like a SettingsGroup title */
  .tags-heading {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin: 0 0 0.75rem 0;
  }

  /* Label + description on the left, control in a fixed column so every control lines up */
  .settings-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 200px;
    column-gap: 24px;
    align-items: center;

    /* Match Preferences > General (SettingsField / CheckboxSetting) label + hint styles */
    > :first-child label {
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 400;
      color: ${(props) => props.theme.text};
      margin: 0;
    }

    > :first-child p {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
      margin: 0.125rem 0 0 0;
    }

    /* Right-align controls so they end where the group divider ends */
    > :last-child {
      justify-self: end;
    }

    /* Max Redirects / Timeout inputs: border and bg come from the theme inline; add the theme focus border */
    input[type='text'] {
      transition: border-color ease-in-out 0.1s;

      &:focus {
        border-color: ${(props) => props.theme.input.focusBorder} !important;
      }
    }
  }
`;

export default StyledWrapper;
