import React from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import StyledWrapper from './StyledWrapper';
import QueryParams from '../QueryParams';
import RequestHeaders from '../RequestHeaders';

const HttpRequestPane = ({leftPaneWidth}) => {
  return (
    <StyledWrapper className="h-full">
      <Tabs className='react-tabs mt-1 flex flex-grow flex-col h-full' forceRenderTabPanel>
        <TabList>
          <Tab tabIndex="-1">Params</Tab>
          <Tab tabIndex="-1">Body</Tab>
          <Tab tabIndex="-1">Headers</Tab>
          <Tab tabIndex="-1">Authorization</Tab>
        </TabList>
        <TabPanel>
          <QueryParams />
        </TabPanel>
        <TabPanel>
          <RequestHeaders />
        </TabPanel>
      </Tabs>
    </StyledWrapper>
  )
};

export default HttpRequestPane;
