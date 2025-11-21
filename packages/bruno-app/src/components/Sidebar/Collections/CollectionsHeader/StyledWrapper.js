import styled from 'styled-components';

const Wrapper = styled.div`
  .collections-badge {
    font-weight: 500;
    font-size: 0.8125rem;
    color: ${(props) => props.theme.sidebar.color};
    opacity: 0.8;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid ${(props) => props.theme.sidebar.bottomBorder};
    border-top: 1px solid ${(props) => props.theme.sidebar.bottomBorder};
    height: 40px;

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background-color: ${(props) => props.theme.sidebar.dropdownIcon.hoverBg};
      }
    }

    .caret {
      margin-left: 0.25rem;
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }

    .collections-header-actions {
      .collection-action-button {
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
      }
    }
  }
`;

export default Wrapper;
