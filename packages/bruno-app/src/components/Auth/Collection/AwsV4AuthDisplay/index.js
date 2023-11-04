import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import SingleLineDisplay from 'components/SingleLineDisplay';
import StyledWrapper from './StyledWrapper';

const AwsV4Auth = ({ collection }) => {
  const { storedTheme } = useTheme();
  const awsv4Auth = get(collection, 'root.request.auth.awsv4', {});

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Access Key ID</label>
      <div className="single-line-display-wrapper mb-2">
        <SingleLineDisplay value={awsv4Auth.accessKeyId || ''} theme={storedTheme} collection={collection} />
      </div>

      <label className="block font-medium mb-2">Secret Access Key</label>
      <div className="single-line-display-wrapper mb-2">
        <SingleLineDisplay value={awsv4Auth.secretAccessKey || ''} theme={storedTheme} collection={collection} />
      </div>

      <label className="block font-medium mb-2">Session Token</label>
      <div className="single-line-display-wrapper mb-2">
        <SingleLineDisplay value={awsv4Auth.sessionToken || ''} theme={storedTheme} collection={collection} />
      </div>

      <label className="block font-medium mb-2">Service</label>
      <div className="single-line-display-wrapper mb-2">
        <SingleLineDisplay value={awsv4Auth.service || ''} theme={storedTheme} collection={collection} />
      </div>

      <label className="block font-medium mb-2">Region</label>
      <div className="single-line-display-wrapper mb-2">
        <SingleLineDisplay value={awsv4Auth.region || ''} theme={storedTheme} collection={collection} />
      </div>

      <label className="block font-medium mb-2">Profile Name</label>
      <div className="single-line-display-wrapper mb-2">
        <SingleLineDisplay value={awsv4Auth.profileName || ''} theme={storedTheme} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default AwsV4Auth;
