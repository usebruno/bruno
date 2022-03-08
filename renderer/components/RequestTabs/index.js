import React from 'react';
import classnames from 'classnames';
import { IconHome2 } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const RequestTabs = ({actions, dispatch, activeRequestTabId, requestTabs}) => {
  const getTabClassname = (tab, index) => {
    return classnames("request-tab select-none", {
      'active': tab.id === activeRequestTabId,
      'last-tab': requestTabs && requestTabs.length && (index === requestTabs.length - 1) 
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

  const createNewTab = () => {
    dispatch({
      type: actions.ADD_NEW_HTTP_REQUEST
    });
  };

  return (
    <StyledWrapper className="mt-2 flex items-center">
      {requestTabs && requestTabs.length ? (
        <ul role="tablist">
          <li className="select-none new-tab mr-1" onClick={createNewTab}>
            <div className="flex items-center home-icon-container">
              <IconHome2 size={18} strokeWidth={1.5}/>
            </div>
          </li>
          {requestTabs && requestTabs.length ? requestTabs.map((rt, index) => {
            return <li key={rt.id} className={getTabClassname(rt, index)} role="tab" onClick={() => handleClick(rt)}>
              <div className="flex items-center justify-between tab-container px-1">
                <div className="flex items-center tab-label pl-2">
                  <span className="tab-method" style={{color: getMethodColor(rt.method)}}>{rt.method}</span>
                  <span className="text-gray-700 ml-1 tab-name">{rt.name}</span>
                </div>
                <div className="flex px-2 close-icon-container" onClick={(e) => handleCloseClick(e, rt)}>
                  {!rt.hasChanges ? (
                    <svg focusable="false"xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="close-icon">
                      <path fill="currentColor" d="M207.6 256l107.72-107.72c6.23-6.23 6.23-16.34 0-22.58l-25.03-25.03c-6.23-6.23-16.34-6.23-22.58 0L160 208.4 52.28 100.68c-6.23-6.23-16.34-6.23-22.58 0L4.68 125.7c-6.23 6.23-6.23 16.34 0 22.58L112.4 256 4.68 363.72c-6.23 6.23-6.23 16.34 0 22.58l25.03 25.03c6.23 6.23 16.34 6.23 22.58 0L160 303.6l107.72 107.72c6.23 6.23 16.34 6.23 22.58 0l25.03-25.03c6.23-6.23 6.23-16.34 0-22.58L207.6 256z"></path>
                    </svg>
                  ) : (
                    <svg focusable="false" xmlns="http://www.w3.org/2000/svg" width="8" height="16" fill="#cc7b1b" class="has-changes-icon" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3"/>
                    </svg>
                  ) }
                </div>
              </div>
            </li>
          }) : null}
          <li className="select-none new-tab ml-1" onClick={createNewTab}>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor"  viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
            </div>
          </li>
          <li className="select-none new-tab choose-request">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
            </div>
          </li>
        </ul>
      ) : null}
    </StyledWrapper>
  );
};

export default RequestTabs;
