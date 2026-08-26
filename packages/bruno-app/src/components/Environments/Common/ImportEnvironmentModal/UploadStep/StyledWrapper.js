import styled from 'styled-components';

export const StyledWrapper = styled.div`
  .upload-container {
    padding: 0.5rem 0;
  }

  .upload-dropzone {
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    width: 100%;
    border-radius: ${(props) => props.theme.border.radius};
    border: 2px dashed ${(props) => props.theme.border.border0};
    padding: 3rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background-color: transparent;

    &:hover {
      border-color: ${(props) => props.theme.colors.text.subtext0};
    }
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px ${(props) => props.theme.brand}, 0 0 0 4px transparent;
    }

    &.is-drag-over {
      border-color: ${(props) => props.theme.colors.text.yellow};
      background-color: ${(props) => props.theme.colors.bg.yellow};
    }
  }

  .upload-dropzone-icon {
    color: ${(props) => props.theme.colors.text.base};
  }

  .upload-dropzone-title {
    margin-top: 0.5rem;
    display: block;
    font-weight: 500;
  }

  .upload-dropzone-subtitle {
    margin-top: 0.25rem;
    display: block;
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;
