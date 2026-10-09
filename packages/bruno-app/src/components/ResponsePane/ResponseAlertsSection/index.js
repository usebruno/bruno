import React from 'react';
import classnames from 'classnames';
import ResponseErrorsCard from '../ResponseErrorsCard';
import UnresolvedVariablesInfo from '../UnresolvedVariablesInfo';
import StyledWrapper from './StyledWrapper';

const ResponseAlertsSection = ({ item, collection, responsePaneErrors }) => {
  const { errors, isCardRemoved, closeCard, isCardFullPane, toggleCardFullPane } = responsePaneErrors;
  const showsErrorsCard = errors.length > 0 && !isCardRemoved;
  const showsUnresolvedVariables = !isCardFullPane && item.unresolvedVariables?.length > 0;

  if (!showsErrorsCard && !showsUnresolvedVariables) return null;

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
    </StyledWrapper>
  );
};

export default ResponseAlertsSection;
