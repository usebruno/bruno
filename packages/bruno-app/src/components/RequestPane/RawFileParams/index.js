import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import RawFilePickerEditor from 'components/RawFilePickerEditor';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';

const RawFileParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const fileName = item.draft ? get(item, 'draft.request.body.rawFile') : get(item, 'request.body.rawFile') || [];

  const handleFileChange = (e) => {
    dispatch(
      updateRequestBody({
        content: e.target.rawFilePath,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  return (
    <StyledWrapper className="w-full">
      <RawFilePickerEditor
        value={fileName ? fileName : null}
        onChange={(rawFilePath) =>
          handleFileChange({
            target: {
              rawFilePath,
            }
          })
        }
        collection={collection}
      />
    </StyledWrapper>
  );
};
export default RawFileParams;
