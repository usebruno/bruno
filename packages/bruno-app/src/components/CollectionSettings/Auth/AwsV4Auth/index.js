import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const AwsV4Auth = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const awsv4Auth = get(collection, 'root.request.auth.awsv4', {});

  const handleSave = () => dispatch(saveCollectionRoot(collection.uid));

  const handleAccessKeyIdChange = (accessKeyId) => {
    dispatch(
      updateCollectionAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
        content: {
          accessKeyId: accessKeyId || '',
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
      updateCollectionAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
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
      updateCollectionAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
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
      updateCollectionAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
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
      updateCollectionAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
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
      updateCollectionAuth({
        mode: 'awsv4',
        collectionUid: collection.uid,
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

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Access Key ID</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.accessKeyId || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAccessKeyIdChange(val)}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Secret Access Key</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.secretAccessKey || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleSecretAccessKeyChange(val)}
          collection={collection}
          isSecret={true}
        />
      </div>

      <label className="block font-medium mb-2">Session Token</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.sessionToken || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleSessionTokenChange(val)}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Service</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.service || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleServiceChange(val)}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Region</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.region || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleRegionChange(val)}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Profile Name</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={awsv4Auth.profileName || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleProfileNameChange(val)}
          collection={collection}
        />
      </div>
    </StyledWrapper>
  );
};

export default AwsV4Auth;
