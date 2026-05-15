import React from 'react';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const WSResponseHeaders = ({ response }) => {
  const { t } = useTranslation();
  const formatHeaders = (headers) => {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([key, value]) => ({ name: key, value }));
  };

  const headersArray = formatHeaders(response.headers);

  return (
    <StyledWrapper className="pb-4 w-full">
      <table>
        <thead>
          <tr>
            <td>{t('WS_RESPONSE.HEADER_NAME')}</td>
            <td>{t('WS_RESPONSE.HEADER_VALUE')}</td>
          </tr>
        </thead>
        <tbody>
          {headersArray && headersArray.length ? (
            headersArray.map((header, index) => (
              <tr key={index}>
                <td className="key">{header.name}</td>
                <td className="value">{header.value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="text-center py-4 text-gray-500">
                {t('WS_RESPONSE.NO_HEADERS_RECEIVED')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default WSResponseHeaders;
