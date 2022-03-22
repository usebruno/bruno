import React from 'react';
import classnames from 'classnames';
import RequestTabs from 'components/RequestTabs';
import RequestTabPanel from 'components/RequestTabPanel';
import Sidebar from 'components/Sidebar';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';

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
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isDragging = useSelector((state) => state.app.isDragging);

  const className = classnames({
    'is-dragging': isDragging
  });

  return (
    <div>
      <StyledWrapper className={className}>
        <Sidebar />
        <section className='flex flex-grow flex-col'>
          <RequestTabs />
          <RequestTabPanel key={activeTabUid}/>
        </section>
      </StyledWrapper>
    </div>
  );
};

