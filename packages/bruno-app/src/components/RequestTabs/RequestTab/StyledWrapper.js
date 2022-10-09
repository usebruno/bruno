import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tab-label {
    overflow: hidden;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;      
  }

  .close-icon-container {
    min-height: 20px;
    min-width: 24px;
    margin-left: 4px;
    border-radius: 3px;

    .close-icon {
      display: none;
      color: #9f9f9f;
      width: 8px;
      padding-bottom: 6px;
      padding-top: 6px;
    }

    &:hover, &:hover .close-icon {
      background-color: #eaeaea;
      color: rgb(76 76 76);
    }

    .has-changes-icon  {
      height: 24px;
    }
  }
`;

export default StyledWrapper;

