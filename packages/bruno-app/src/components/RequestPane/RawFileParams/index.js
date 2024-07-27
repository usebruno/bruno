import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';

import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor';

const RawFileParams = ({ item, collection }) => {
    const dispatch = useDispatch();
    const { storedTheme } = useTheme();
    
    return (
        <StyledWrapper>

        </StyledWrapper>
    );
};
export default RawFileParams;