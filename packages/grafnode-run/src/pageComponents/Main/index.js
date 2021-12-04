import React from 'react';
import dynamic from 'next/dynamic'
import {
  Navbar,
  RequestTabs,
  Sidebar
} from '@grafnode/components';
import actions from 'providers/Store/actions';
import { useStore } from '../../providers/Store/index';
import StyledWrapper from './StyledWrapper';

const RequestTabPanel = dynamic(import('@grafnode/components').then(mod => mod.RequestTabPanel), { ssr: false });

export default function Main() {
  // disable ssr
  if(typeof window === 'undefined') {
    return null;
  }

  const [state, dispatch] = useStore();

  const {
    collections,
    requestTabs,
    activeRequestTabId
  } = state;

  return (
    <div>
      <Navbar />
      <StyledWrapper>
        <Sidebar
          collections={collections}
          actions={actions}
          dispatch={dispatch}
          activeRequestTabId={activeRequestTabId}
        />
        <section className='mt-4 flex flex-grow flex-col'>
          <RequestTabs
            requestTabs={requestTabs}
            actions={actions}
            dispatch={dispatch}
            activeRequestTabId={activeRequestTabId}
          />
          <RequestTabPanel
            collections={collections}
            requestTabs={requestTabs}
            activeRequestTabId={activeRequestTabId}
          />
        </section>
      </StyledWrapper>
    </div>
  )
}