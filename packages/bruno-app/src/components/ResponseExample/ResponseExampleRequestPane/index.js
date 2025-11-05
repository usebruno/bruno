import React from 'react';
import ResponseExampleUrlBar from './ResponseExampleUrlBar';
import ResponseExampleParams from './ResponseExampleParams';
import ResponseExampleHeaders from './ResponseExampleHeaders';
import ResponseExampleBody from './ResponseExampleBody';
import StyledWrapper from './StyledWrapper';
import HeightBoundContainer from 'ui/HeightBoundContainer';

const ResponseExampleRequestPane = ({ item, collection, editMode, exampleUid, onSave }) => {
  return (
    <HeightBoundContainer>
      <StyledWrapper className="flex flex-col h-full w-full">
        <ResponseExampleUrlBar
          item={item}
          collection={collection}
          exampleUid={exampleUid}
          editMode={editMode}
          onSave={onSave}
        />

        <ResponseExampleParams
          editMode={editMode}
          item={item}
          collection={collection}
          exampleUid={exampleUid}
        />

        <ResponseExampleHeaders
          editMode={editMode}
          item={item}
          collection={collection}
          exampleUid={exampleUid}
        />

        <ResponseExampleBody
          editMode={editMode}
          item={item}
          collection={collection}
          exampleUid={exampleUid}
          onSave={onSave}
        />
      </StyledWrapper>
    </HeightBoundContainer>
  );
};

export default ResponseExampleRequestPane;
