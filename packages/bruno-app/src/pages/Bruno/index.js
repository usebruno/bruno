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
