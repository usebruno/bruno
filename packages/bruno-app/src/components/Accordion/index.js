import React, { createContext, useContext, useState } from 'react';
import { IconChevronDown } from '@tabler/icons';
import { AccordionItem, AccordionHeader, AccordionContent } from './styledWrapper';

const AccordionContext = createContext();

const Accordion = ({ children, defaultIndex }) => {
  const [openIndex, setOpenIndex] = useState(defaultIndex);

  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <AccordionContext.Provider value={{ openIndex, toggleItem }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  );
};

const Item = ({ index, children, ...props }) => {
  return (
    <AccordionItem {...props}>
      {React.Children.map(children, (child) => React.cloneElement(child, { index }))}
    </AccordionItem>
  );
};

export const Header = ({ index, children, ...props }) => {
  const { openIndex, toggleItem } = useContext(AccordionContext);
  const isOpen = openIndex === index;

  return (
    <AccordionHeader onClick={() => toggleItem(index)} {...props} className={isOpen ? 'open' : ''}>
      <div className="w-full">{children}</div>

      <IconChevronDown
        className="w-5 h-5 ml-auto"
        style={{
          transform: `rotate(${isOpen ? '180deg' : '0deg'})`,
          transition: 'transform 0.3s ease-in-out'
        }}
      />
    </AccordionHeader>
  );
};

const Content = ({ index, children, ...props }) => {
  const { openIndex } = useContext(AccordionContext);
  const isOpen = openIndex === index;

  return (
    <AccordionContent isOpen={isOpen} {...props}>
      {children}
    </AccordionContent>
  );
};

Accordion.Item = Item;
Accordion.Header = Header;
Accordion.Content = Content;
export default Accordion;
