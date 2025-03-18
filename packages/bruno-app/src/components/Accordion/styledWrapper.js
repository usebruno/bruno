import styled from 'styled-components';

const AccordionItem = styled.div`
  border: 1px solid ${(props) => props.theme.input.border};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const AccordionHeader = styled.button`
  width: 100%;
  display: flex;
  padding: 0.75rem 1rem;
  background: transparent;
  cursor: pointer;
  font-weight: 500;

  &.open, &:hover {
    background-color: ${(props) => props.theme.plainGrid.hoverBg};
  }
`;

const AccordionContent = styled.div`
  padding: ${(props) => (props.isOpen ? '1rem' : '0')};
  max-height: ${(props) => (props.isOpen ? 'auto' : '0')};
`;

export { AccordionItem, AccordionHeader, AccordionContent };
