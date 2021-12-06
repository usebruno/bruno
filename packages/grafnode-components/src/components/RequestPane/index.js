import React from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import StyledWrapper from './StyledWrapper';
import QueryEditor from '../QueryEditor';

const RequestPane = ({onRunQuery, schema, leftPaneWidth, value, onQueryChange}) => {
  return (
    <StyledWrapper className="">
      <Tabs className='react-tabs mt-1 flex flex-grow flex-col' forceRenderTabPanel>
        <TabList>
          <Tab tabIndex="-1">Query</Tab>
          <Tab tabIndex="-1">Headers</Tab>
        </TabList>
        <TabPanel>
          <QueryEditor
            schema={schema}
            width={leftPaneWidth}
            value={value}
            onRunQuery={onRunQuery}
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
