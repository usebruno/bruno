import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateRawFile } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor';

const RawFileParams = ({ item, collection }) => {
    const dispatch = useDispatch();
    const { storedTheme } = useTheme();
    const fileName = item.draft ? get(item, 'draft.request.body.rawFile') : get(item, 'request.body.rawFile') || [];

    const handleFileChange = (e, __filename) => {
        const fileName = cloneDeep(__filename);
        fileName.value = e.target.value;

        dispatch(
            updateRawFile({
                param: fileName,
                itemUid: item.uid,
                collectionUid: collection.uid
            })
        );
    };

    return (
        <StyledWrapper>
            <FilePickerEditor
                value={ fileName ? fileName.value : null }
                onChange={(newValue) =>
                    handleFileChange(
                        {
                            target: {
                                value: newValue
                            }
                        },
                        fileName
                    )
                }
                collection={collection} />
        </StyledWrapper>
    );
};
export default RawFileParams;