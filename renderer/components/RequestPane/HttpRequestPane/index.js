import React from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import QueryParams from 'components/RequestPane/QueryParams';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import RequestBody from 'components/RequestPane/RequestBody';
import StyledWrapper from './StyledWrapper';

const HttpRequestPane = ({item, collection, leftPaneWidth}) => {
  return (
    <StyledWrapper className="h-full">
      <Tabs className='react-tabs mt-1 flex flex-grow flex-col h-full'>
        <TabList>
          <Tab tabIndex="-1">Params</Tab>
          <Tab tabIndex="-1">Body</Tab>
          <Tab tabIndex="-1">Headers</Tab>
          <Tab tabIndex="-1">Auth</Tab>
        </TabList>
        <TabPanel>
          <QueryParams />
        </TabPanel>
        <TabPanel>
          <RequestBody item={item} collection={collection}/>
        </TabPanel>
        <TabPanel>
          <RequestHeaders item={item} collection={collection}/>
        </TabPanel>
        <TabPanel>
          <div>Auth</div>
        </TabPanel>
      </Tabs>
    </StyledWrapper>
  )
};

export default HttpRequestPane;
