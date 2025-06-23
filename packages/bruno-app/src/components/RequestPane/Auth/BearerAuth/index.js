import React from 'react';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useIdentifySensitiveField } from 'hooks/useIdentifySensitiveField';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { getSensitiveFieldWarning } from 'utils/common/sensitiveField';

const BearerAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  // Use the request prop directly like OAuth2ClientCredentials does
  const bearerToken = get(request, 'auth.bearer.token', '');
  const { isSensitive } = useIdentifySensitiveField(collection);

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  
  const handleSave = () => {
    save();
  };

  const handleTokenChange = (token) => {
    dispatch(
      updateAuth({
        mode: 'bearer',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          token: token
        }
      })
    );
  };

  const { showWarning: envVarWarning } = isSensitive(bearerToken, true);
  const { showWarning, message: warningMessage } = getSensitiveFieldWarning(bearerToken, envVarWarning);

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Token</label>
      <div className="single-line-editor-wrapper flex items-center">
        <SingleLineEditor
          value={bearerToken}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleTokenChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
        />
        <SensitiveFieldWarning
          showWarning={showWarning}
          fieldName="bearer-token"
          message={warningMessage}
        />
      </div>
    </StyledWrapper>
  );
};

export default BearerAuth;
