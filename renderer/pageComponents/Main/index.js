import React from 'react';
import RequestTabs from 'components/RequestTabs';
import RequestTabPanel from 'components/RequestTabPanel';
import Sidebar from 'components/Sidebar';
import actions from 'providers/Store/actions';
import { useStore } from '../../providers/Store/index';
import StyledWrapper from './StyledWrapper';

import { IconStack, IconGitFork } from '@tabler/icons';

const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;
if(!SERVER_RENDERED) {
  require('codemirror/mode/javascript/javascript');
  require('codemirror/mode/javascript/javascript');
  require('codemirror/addon/edit/matchbrackets');
  require('codemirror/addon/fold/brace-fold');
  require('codemirror/addon/fold/foldgutter');
  require('codemirror/addon/hint/show-hint');
  require('codemirror/keymap/sublime');
  require('codemirror/addon/comment/comment');
  require('codemirror/addon/edit/closebrackets');
  require('codemirror/addon/search/search');
  require('codemirror/addon/search/searchcursor');
  require('codemirror/addon/search/jump-to-line');
  require('codemirror/addon/dialog/dialog');

  require('codemirror-graphql/hint');
  require('codemirror-graphql/lint');
  require('codemirror-graphql/info');
  require('codemirror-graphql/jump');
  require('codemirror-graphql/mode');
}


export default function Main() {
  const [state, dispatch] = useStore();

  if (SERVER_RENDERED) {
    return null;
  }

  const {
    collections,
    requestTabs,
    activeRequestTabId
  } = state;

  return (
    <div>
      <StyledWrapper>
        <Sidebar
          collections={collections}
          actions={actions}
          dispatch={dispatch}
          activeRequestTabId={activeRequestTabId}
        />
        <section className='flex flex-grow flex-col'>
          <div className="flex items-center" style={{padding: "8px", paddingBottom: "4px"}}>
            <IconStack size={18} strokeWidth={1.5}/>
            <span className="ml-2 mr-4 font-semibold">spacex</span>
            <IconGitFork size={16} strokeWidth={1}/>
            <span className="ml-1 text-xs">main</span>
          </div>
          <RequestTabs
            requestTabs={requestTabs}
            actions={actions}
            dispatch={dispatch}
            activeRequestTabId={activeRequestTabId}
          />
          <RequestTabPanel
            actions={actions}
            dispatch={dispatch}
            collections={collections}
            requestTabs={requestTabs}
            activeRequestTabId={activeRequestTabId}
          />
        </section>
      </StyledWrapper>
    </div>
  );
};

