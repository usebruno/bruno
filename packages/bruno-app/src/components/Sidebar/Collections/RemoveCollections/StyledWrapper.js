import styled from 'styled-components';

const RequestTag = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background-color: ${props => props.theme.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 400;
  color: ${props => props.theme.text};
`;

const RequestTagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 1rem;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.text.muted}40;
    border-radius: 3px;

    &:hover {
      background-color: ${props => props.theme.colors.text.muted}60;
    }
  }
`;

export { RequestTag, RequestTagsContainer };
