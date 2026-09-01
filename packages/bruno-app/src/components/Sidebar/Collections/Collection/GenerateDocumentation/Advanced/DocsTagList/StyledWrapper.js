import styled from 'styled-components';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;

  .docs-tag-field {
    min-width: 0;
  }

  .docs-tag-input {
    width: 100%;
    min-width: 0;
    padding: 0.375rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    background-color: ${(props) => props.theme.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.base};
    outline: none;

    &::placeholder {
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    &:focus {
      border-color: ${(props) => props.theme.colors.text.subtext0};
    }
  }

  .docs-tag-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
  }

  .docs-tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .docs-tag-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    max-width: 100%;
    padding: 0.25rem;
    background-color: transparent;
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .docs-tag-icon {
    color: ${(props) => props.theme.colors.text.subtext0};
    flex-shrink: 0;
  }

  .docs-tag-text {
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.25rem;
    color: ${(props) => props.theme.text};
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .docs-tag-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.subtext0};
    flex-shrink: 0;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }
`;

export const Menu = styled.ul`
  position: fixed;
  z-index: 100;
  box-sizing: border-box;
  max-height: 10rem;
  overflow-x: auto;
  overflow-y: auto;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  background-color: ${(props) => props.theme.dropdown.bg};
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: ${(props) => props.theme.border.radius.base};
  box-shadow: ${(props) => props.theme.dropdown.shadow};

  .docs-tag-menu-item {
    box-sizing: border-box;
    min-width: 100%;
    width: max-content;
    padding: 0.25rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    border-radius: ${(props) => props.theme.border.radius.base};
    white-space: nowrap;
    cursor: pointer;

    &.highlighted {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }
  }
`;
