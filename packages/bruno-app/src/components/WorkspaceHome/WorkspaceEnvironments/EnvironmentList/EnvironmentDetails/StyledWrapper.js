import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${(props) => props.theme.bg};

  .header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 8px 20px;
    flex-shrink: 0;
    
    .title {
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 500;
      color: ${(props) => props.theme.text};
      margin: 0;
    }
    
    .title-container {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      
      &.renaming {
        .title-input {
          flex: 1;
          background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
          outline: none;
          color: ${(props) => props.theme.text};
          font-size: 15px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 5px;
        }
        
        .inline-actions {
          display: flex;
          gap: 2px;
        }
        
        .inline-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          
          &.save {
            color: ${(props) => props.theme.textLink};
            
            &:hover {
              background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
            }
          }
          
          &.cancel {
            color: ${(props) => props.theme.colors.text.muted};
            
            &:hover {
              background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
              color: ${(props) => props.theme.text};
            }
          }
        }
      }
    }
    
    .title-error {
      position: absolute;
      top: 100%;
      left: 20px;
      margin-top: 4px;
      padding: 4px 8px;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => props.theme.bg};
      border: 1px solid ${(props) => props.theme.colors.text.danger};
      border-radius: 4px;
      white-space: nowrap;
    }
    
    .actions {
      display: flex;
      align-items: center;
      gap: 2px;

      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        .search-icon {
          position: absolute;
          left: 8px;
          color: ${(props) => props.theme.colors.text.muted};
          pointer-events: none;
        }

        .search-input {
          width: 200px;
          padding: 5px 32px 5px 32px;
          border: 1px solid ${(props) => props.theme.input.border};
          border-radius: ${(props) => props.theme.border.radius.sm};
          background: ${(props) => props.theme.input.bg};
          color: ${(props) => props.theme.text};
          font-size: ${(props) => props.theme.font.size.base};
          outline: none;
          transition: border-color 0.15s ease;

          &:focus {
            border-color: ${(props) => props.theme.input.focusBorder};
          }

          &::placeholder {
            color: ${(props) => props.theme.input.placeholder.color};
            opacity: ${(props) => props.theme.input.placeholder.opacity};
          }
        }

        .clear-search {
          position: absolute;
          right: 1px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${(props) => props.theme.colors.text.muted};
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: ${(props) => props.theme.border.radius.sm};
          transition: all 0.15s ease;

          &:hover {
            color: ${(props) => props.theme.text};
            background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
          }
        }
      }

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        color: ${(props) => props.theme.colors.text.muted};
        background: transparent;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.15s ease;
        
        &:hover {
          background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
          color: ${(props) => props.theme.text};
        }
        
        &:last-child:hover {
          color: ${(props) => props.theme.colors.text.danger};
        }
      }
    }
  }
  
  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0 20px 20px 20px;
  }
`;

export default StyledWrapper;
