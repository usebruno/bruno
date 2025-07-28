import React, { useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import { getSensitiveFieldWarning } from 'utils/common/sensitiveField';

const AwsV4Auth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const awsv4Auth = get(request, 'auth.awsv4', {});
  const { isSensitive } = useDetectSensitiveField(collection);

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  
  const handleSave = () => {
    save();
  };

  const handleAccessKeyIdChange = (accessKeyId) => {
    dispatch(
      updateAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          accessKeyId: accessKeyId,
          secretAccessKey: awsv4Auth.secretAccessKey || '',
          sessionToken: awsv4Auth.sessionToken || '',
          service: awsv4Auth.service || '',
          region: awsv4Auth.region || '',
          profileName: awsv4Auth.profileName || ''
        }
      })
    );
  };

  const handleSecretAccessKeyChange = (secretAccessKey) => {
    dispatch(
      updateAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          accessKeyId: awsv4Auth.accessKeyId || '',
          secretAccessKey: secretAccessKey || '',
          sessionToken: awsv4Auth.sessionToken || '',
          service: awsv4Auth.service || '',
          region: awsv4Auth.region || '',
          profileName: awsv4Auth.profileName || ''
        }
      })
    );
  };

  const handleSessionTokenChange = (sessionToken) => {
    dispatch(
      updateAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          accessKeyId: awsv4Auth.accessKeyId || '',
          secretAccessKey: awsv4Auth.secretAccessKey || '',
          sessionToken: sessionToken || '',
          service: awsv4Auth.service || '',
          region: awsv4Auth.region || '',
          profileName: awsv4Auth.profileName || ''
        }
      })
    );
  };

  const handleServiceChange = (service) => {
    dispatch(
      updateAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          accessKeyId: awsv4Auth.accessKeyId || '',
          secretAccessKey: awsv4Auth.secretAccessKey || '',
          sessionToken: awsv4Auth.sessionToken || '',
          service: service || '',
          region: awsv4Auth.region || '',
          profileName: awsv4Auth.profileName || ''
        }
      })
    );
  };

  const handleRegionChange = (region) => {
    dispatch(
      updateAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          accessKeyId: awsv4Auth.accessKeyId || '',
          secretAccessKey: awsv4Auth.secretAccessKey || '',
          sessionToken: awsv4Auth.sessionToken || '',
          service: awsv4Auth.service || '',
          region: region || '',
          profileName: awsv4Auth.profileName || ''
        }
      })
    );
  };

  const handleProfileNameChange = (profileName) => {
    dispatch(
      updateAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          accessKeyId: awsv4Auth.accessKeyId || '',
          secretAccessKey: awsv4Auth.secretAccessKey || '',
          sessionToken: awsv4Auth.sessionToken || '',
          service: awsv4Auth.service || '',
          region: awsv4Auth.region || '',
          profileName: profileName || ''
        }
      })
    );
  };

  const { showWarning, warningMessage } = isSensitive(awsv4Auth?.secretAccessKey);

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Access Key ID</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.accessKeyId || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAccessKeyIdChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Secret Access Key</label>
      <div className="single-line-editor-wrapper mb-2 flex items-center">
        <SingleLineEditor
          value={awsv4Auth.secretAccessKey || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleSecretAccessKeyChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
        />

        {showWarning && <SensitiveFieldWarning fieldName="awsv4-secret-access-key" warningMessage={warningMessage} />}
      </div>

      <label className="block font-medium mb-2">Session Token</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.sessionToken || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleSessionTokenChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Service</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.service || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleServiceChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Region</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.region || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleRegionChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Profile Name</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.profileName || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleProfileNameChange(val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>
    </StyledWrapper>
  );
};

export default AwsV4Auth;
