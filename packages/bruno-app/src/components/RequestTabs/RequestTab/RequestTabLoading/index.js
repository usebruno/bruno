import React from 'react';
import GradientCloseButton from '../GradientCloseButton';

/**
 * RequestTabLoading
 *
 * Displays a loading placeholder for a tab while its collection is mounting
 * or the item is still being loaded. Shows the stored name from the snapshot.
 */
const RequestTabLoading = ({ handleCloseClick, name }) => {
  return (
    <>
      <div className="flex items-baseline tab-label">
        <span className="tab-name" title={name}>{name}</span>
      </div>
      <GradientCloseButton onClick={handleCloseClick} hasChanges={false} />
    </>
  );
};

export default RequestTabLoading;
