import React from 'react';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const ResponseTrailers = ({ trailers }) => {
  const { t } = useTranslation();
  const trailersArray = Array.isArray(trailers) ? trailers : [];

  return (
    <StyledWrapper className="pb-4 w-full">
      <table>
        <thead>
          <tr>
            <td>{t('GRPC_RESPONSE.NAME')}</td>
            <td>{t('GRPC_RESPONSE.VALUE')}</td>
          </tr>
        </thead>
        <tbody>
          {trailersArray && trailersArray.length ? (
            trailersArray.map((trailer, index) => (
              <tr key={index}>
                <td className="key">{trailer.name}</td>
                <td className="value">{trailer.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="text-center py-4 empty-message">
                {t('GRPC_RESPONSE.NO_TRAILERS_RECEIVED')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default ResponseTrailers;
