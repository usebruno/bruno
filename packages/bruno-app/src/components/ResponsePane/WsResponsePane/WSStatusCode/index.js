import React from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import useWsStatusCodePhraseMap from './get-ws-status-code-phrase';
import StyledWrapper from './StyledWrapper';

const WSStatusCode = ({ status, text }) => {
  const { t } = useTranslation();
  const wsStatusCodePhraseMap = useWsStatusCodePhraseMap();

  const getTabClassname = (status) => {
    return classnames('ml-2', {
      // ok if normal connect and normal closure
      'text-ok': parseInt(status) === 0 || parseInt(status) === 1000,
      'text-error': parseInt(status) !== 1000 && parseInt(status) !== 0
    });
  };

  const statusText = text || wsStatusCodePhraseMap[status];

  return (
    <StyledWrapper className={getTabClassname(status)}>
      {Number.isInteger(status) && status != 0 ? <div className="mr-1">{status}</div> : null}
      {statusText && <div>{statusText}</div>}
    </StyledWrapper>
  );
};

export default WSStatusCode;
