import React from 'react';
import { useState, useContext } from 'react';
import { dictionaries } from 'src/dictionaries/index';

export const DictionaryContext = React.createContext();

const DictionaryProvider = (props) => {
  const [language, setLanguage] = useState('en');
  const dictionary = dictionaries[language] ?? dictionaries.en;

  return (
    <DictionaryContext.Provider {...props} value={{ language, setLanguage, dictionary }}>
      <>{props.children}</>
    </DictionaryContext.Provider>
  );
};

const useDictionary = () => {
  const context = useContext(DictionaryContext);

  if (context === undefined) {
    throw new Error(`useDictionary must be used within a DictionaryProvider`);
  }

  return context;
};

export { useDictionary, DictionaryProvider };
