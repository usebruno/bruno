import React from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import StyledWrapper from './StyledWrapper';
import QueryEditor from '../QueryEditor';

const RequestPane = ({leftPaneWidth, query, onQueryChange}) => {
  return (
    <StyledWrapper className="">
      <Tabs className='react-tabs mt-1 flex flex-grow flex-col' forceRenderTabPanel>
        <TabList>
          <Tab tabIndex="-1">Query</Tab>
          <Tab tabIndex="-1">Headers</Tab>
        </TabList>
        <TabPanel>
          <QueryEditor
            width={leftPaneWidth}
            query={query}
            onChange={onQueryChange}
          />
        </TabPanel>
        <TabPanel>
          Headers
        </TabPanel>
      </Tabs>
    </StyledWrapper>
  )
};

export default RequestPane;
