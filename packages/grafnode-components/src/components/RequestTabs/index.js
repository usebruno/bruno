import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const RequestTabs = ({actions, dispatch, activeRequestTabId, requestTabs}) => {
  const getTabClassname = (tab) => {
    return classnames("request-tab select-none", {
      'active': tab.id === activeRequestTabId
    });
  };

  const getMethodColor = (method) => {
    let color = '';
    switch(method) {
      case 'GET': {
        color = 'rgb(5, 150, 105)';
        break;
      }
      case 'POST': {
        color = '#8e44ad';
        break;
      }
    }

    return color;
  };

  const handleClick = (tab) => {
    dispatch({
      type: actions.REQUEST_TAB_CLICK,
      requestTab: tab
    });
  };

  const handleCloseClick = (event, tab) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch({
      type: actions.REQUEST_TAB_CLOSE,
      requestTab: tab
    });
  };

  return (
    <StyledWrapper className="mt-3 flex items-center">
      <ul role="tablist">
        {requestTabs && requestTabs.length ? requestTabs.map((rt) => {
          return <li key={rt.id} className={getTabClassname(rt)} role="tab" onClick={() => handleClick(rt)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center tab-label">
                <span className="tab-method" style={{fontSize: 13, color: getMethodColor(rt.method)}}>{rt.method}</span>
                <span className="text-gray-700 ml-1 tab-name">{rt.name}</span>
              </div>
              {rt.id === activeRequestTabId ? (
                <div className="flex pl-2 close-icon-container" onClick={(e) => handleCloseClick(e, rt)}>
                  <svg focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="close-icon">
                    <path fill="currentColor" d="M207.6 256l107.72-107.72c6.23-6.23 6.23-16.34 0-22.58l-25.03-25.03c-6.23-6.23-16.34-6.23-22.58 0L160 208.4 52.28 100.68c-6.23-6.23-16.34-6.23-22.58 0L4.68 125.7c-6.23 6.23-6.23 16.34 0 22.58L112.4 256 4.68 363.72c-6.23 6.23-6.23 16.34 0 22.58l25.03 25.03c6.23 6.23 16.34 6.23 22.58 0L160 303.6l107.72 107.72c6.23 6.23 16.34 6.23 22.58 0l25.03-25.03c6.23-6.23 6.23-16.34 0-22.58L207.6 256z"></path>
                  </svg>
                </div>
              ) : null}
            </div>
          </li>
        }) : null}
      </ul>
    </StyledWrapper>
  );
};

export default RequestTabs;
