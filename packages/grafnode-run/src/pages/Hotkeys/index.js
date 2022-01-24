import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Mousetrap from 'mousetrap';
import SearchNotebase from 'components/SearchNotebase';
import { useStore } from 'providers/Store';
import actions from 'providers/Store/actions';
import { safeTrim, isStringWithAtleastAChar} from 'utils/text';

export const HotkeysContext = React.createContext();

export const HotkeysProvider = props => {
  const router = useRouter();
  const [openSearch, setOpenSearch] = useState(false);
  const [state, dispatch, saveTransactions] = useStore();
  const {
    notebaseName
  } = state;

  const searchNotebase = () => {
    if(!openSearch) {
      setOpenSearch(true);
    }
  };

  useEffect(() => {
    Mousetrap.bind(['command+k', 'ctrl+k', 'shift shift'], (e) => {
      if(!openSearch) {
        setOpenSearch(true);
      }

      return false; // this stops the event bubbling
    });

    Mousetrap.bind(['command+s', 'ctrl+s'], (e) => {
      saveTransactions();

      return false; // this stops the event bubbling
    });

    return () => {
      Mousetrap.unbind(['command+k', 'ctrl+k', 'shift shift']);
      Mousetrap.unbind(['command+s', 'ctrl+s']);
    };
  }, []);

  const closeSearchModal = () => setOpenSearch(false);

  // todo: instead of passing router, perhaps have a action to update current page and a useEffect to push url
  // https://stackoverflow.com/questions/58633756/is-it-possible-to-put-a-callback-to-usereducers-dispatch-in-react-hooks
  const handleSelect = (page) => {
    setOpenSearch(false);
    if(!page || !isStringWithAtleastAChar(page.title)) {
      return;
    }

    if(page.uid) {
      router.push(`/n/${notebaseName}/${page.uid}`);
    } else {
      dispatch({
        type: actions.NEW_PAGE,
        title: safeTrim(page.title),
        router: router
      });
    }
  };

  const value = {
    searchNotebase: searchNotebase
  };

  return (
    <HotkeysContext.Provider value={value} {...props}>
      {openSearch && (
        <SearchNotebase onClose={closeSearchModal} onSelect={handleSelect}/>
      )}
      {props.children}
    </HotkeysContext.Provider>
  );
};

export const useHotkeys = () =>  {
  const context = React.useContext(HotkeysContext);

  if (!context) {
    throw new Error(`useHotkeys must be used within a HotkeysProvider`);
  }

  return context;
}

export default HotkeysProvider;
