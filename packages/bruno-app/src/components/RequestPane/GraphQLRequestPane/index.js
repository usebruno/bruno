import React from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import QueryEditor from "components/RequestPane/QueryEditor";
import RequestHeaders from "components/RequestPane/RequestHeaders";
import StyledWrapper from "./StyledWrapper";

const GraphQLRequestPane = ({ onRunQuery, schema, leftPaneWidth, value, onQueryChange }) => {
  return (
    <StyledWrapper className="h-full">
      <Tabs className="react-tabs mt-1 flex flex-grow flex-col h-full" forceRenderTabPanel>
        <TabList>
          <Tab tabIndex="-1">Query</Tab>
          <Tab tabIndex="-1">Headers</Tab>
        </TabList>
        <TabPanel>
          <div className="mt-4">
            <QueryEditor schema={schema} width={leftPaneWidth} value={value} onRunQuery={onRunQuery} onEdit={onQueryChange} />
          </div>
        </TabPanel>
        <TabPanel>
          <RequestHeaders />
        </TabPanel>
      </Tabs>
    </StyledWrapper>
  );
};

export default GraphQLRequestPane;
