import React from 'react';
import classnames from 'classnames';
import Welcome from 'components/Welcome';
import RequestTabs from 'components/RequestTabs';
import RequestTabPanel from 'components/RequestTabPanel';
import Sidebar from 'components/Sidebar';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import 'codemirror/theme/material.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/addon/scroll/simplescrollbars.css';

const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;
if (!SERVER_RENDERED) {
  require('codemirror/mode/javascript/javascript');
  require('codemirror/mode/xml/xml');
  require('codemirror/mode/sparql/sparql');
  require('codemirror/addon/comment/comment');
  require('codemirror/addon/dialog/dialog');
  require('codemirror/addon/edit/closebrackets');
  require('codemirror/addon/edit/matchbrackets');
  require('codemirror/addon/fold/brace-fold');
  require('codemirror/addon/fold/foldgutter');
  require('codemirror/addon/fold/xml-fold');
  require('codemirror/addon/hint/javascript-hint');
  require('codemirror/addon/hint/show-hint');
  require('codemirror/addon/lint/lint');
  require('codemirror/addon/lint/json-lint');
  require('codemirror/addon/mode/overlay');
  require('codemirror/addon/scroll/simplescrollbars');
  require('codemirror/addon/search/jump-to-line');
  require('codemirror/addon/search/search');
  require('codemirror/addon/search/searchcursor');
  require('codemirror/addon/display/placeholder');
  require('codemirror/keymap/sublime');

  require('codemirror-graphql/hint');
  require('codemirror-graphql/info');
  require('codemirror-graphql/jump');
  require('codemirror-graphql/lint');
  require('codemirror-graphql/mode');

  require('utils/codemirror/brunoVarInfo');
  require('utils/codemirror/javascript-lint');
  require('utils/codemirror/autocomplete');
}

export default function Main() {
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isDragging = useSelector((state) => state.app.isDragging);
  const showHomePage = useSelector((state) => state.app.showHomePage);

  // Todo: write a better logging flow that can be used to log by turning on debug flag
  // Enable for debugging.
  // console.log(useSelector((state) => state.collections.collections));

  const className = classnames({
    'is-dragging': isDragging
  });

  return (
    <div>
      <StyledWrapper className={className}>
        <Sidebar />
        <section className="flex flex-grow flex-col overflow-auto">
          {showHomePage ? (
            <Welcome />
          ) : (
            <>
              <RequestTabs />
              <RequestTabPanel key={activeTabUid} />
            </>
          )}
        </section>
      </StyledWrapper>
    </div>
  );
}
