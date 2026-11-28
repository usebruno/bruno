import React from 'react';
import classnames from 'classnames';
import ContentLengthWithTransferEncodingWarning, { hasContentLengthWithTransferEncoding } from '../ContentLengthWithTransferEncodingWarning';
import ResponseErrorsCard from '../ResponseErrorsCard';
import UnresolvedVariablesInfo from '../UnresolvedVariablesInfo';
import StyledWrapper from './StyledWrapper';

const ResponseAlertsSection = ({ item, collection, responsePaneErrors }) => {
  const { errors, isCardClosed, closeCard, isCardFullPane, toggleCardFullPane } = responsePaneErrors;
  const showsErrorsCard = errors.length > 0 && !isCardClosed;
  const showsUnresolvedVariables = !isCardFullPane && item.unresolvedVariables?.length > 0;
  const showsContentLengthWithTransferEncoding = !isCardFullPane && hasContentLengthWithTransferEncoding(item.response?.headers);

  if (!showsErrorsCard && !showsUnresolvedVariables && !showsContentLengthWithTransferEncoding) return null;

  return (
    <StyledWrapper className={classnames({ 'full-pane': isCardFullPane })}>
      {showsErrorsCard && (
        <ResponseErrorsCard
          key={`${item.uid}-${item.requestUid}`}
          errors={errors}
          item={item}
          collection={collection}
          isCardFullPane={isCardFullPane}
          onToggleCardFullPane={toggleCardFullPane}
          onClose={closeCard}
        />
      )}
      {showsUnresolvedVariables && <UnresolvedVariablesInfo item={item} collection={collection} />}
      {showsContentLengthWithTransferEncoding && <ContentLengthWithTransferEncodingWarning />}
    </StyledWrapper>
  );
};

export default ResponseAlertsSection;
