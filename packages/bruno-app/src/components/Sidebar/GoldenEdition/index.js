import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'components/Modal/index';
import { useTranslation } from 'react-i18next';
import { PostHog } from 'posthog-node';
import { uuid } from 'utils/common';
import { IconHeart, IconUser, IconUsers, IconPlus } from '@tabler/icons';
import platformLib from 'platform';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme/index';

let posthogClient = null;
const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
const getPosthogClient = () => {
  if (posthogClient) {
    return posthogClient;
  }

  posthogClient = new PostHog(posthogApiKey);
  return posthogClient;
};
const getAnonymousTrackingId = () => {
  let id = localStorage.getItem('bruno.anonymousTrackingId');

  if (!id || !id.length || id.length !== 21) {
    id = uuid();
    localStorage.setItem('bruno.anonymousTrackingId', id);
  }

  return id;
};

const HeartIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className="flex-shrink-0 w-5 h-4 text-yellow-600"
      viewBox="0 0 16 16"
    >
      <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z" />
    </svg>
  );
};

const CheckIcon = () => {
  return (
    <svg
      className="flex-shrink-0 w-5 h-5 text-green-500"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      >
      </path>
    </svg>
  );
};

const GoldenEdition = ({ onClose }) => {
  const { t } = useTranslation();
  const { displayedTheme } = useTheme();

  useEffect(() => {
    const anonymousId = getAnonymousTrackingId();
    const client = getPosthogClient();
    client.capture({
      distinctId: anonymousId,
      event: 'golden-edition-modal-opened',
      properties: {
        os: platformLib.os.family
      }
    });
  }, []);

  const goldenEditionBuyClick = () => {
    const anonymousId = getAnonymousTrackingId();
    const client = getPosthogClient();
    client.capture({
      distinctId: anonymousId,
      event: 'golden-edition-buy-clicked',
      properties: {
        os: platformLib.os.family
      }
    });
  };

  const goldenEditionIndividuals = useMemo(() => [
    t('SIDEBAR.GOLDEN_FEATURE_FILE_EXPLORER'),
    t('SIDEBAR.GOLDEN_FEATURE_VISUAL_GIT'),
    t('SIDEBAR.GOLDEN_FEATURE_GRPC_WS'),
    t('SIDEBAR.GOLDEN_FEATURE_LOAD_DATA'),
    t('SIDEBAR.GOLDEN_FEATURE_DEVTOOLS'),
    t('SIDEBAR.GOLDEN_FEATURE_OPENAPI_DESIGNER'),
    t('SIDEBAR.GOLDEN_FEATURE_PERFORMANCE'),
    t('SIDEBAR.GOLDEN_FEATURE_TERMINAL'),
    t('SIDEBAR.GOLDEN_FEATURE_CUSTOM_THEMES')
  ], [t]);

  const goldenEditionOrganizations = useMemo(() => [
    t('SIDEBAR.GOLDEN_FEATURE_LICENSE_MGMT'),
    t('SIDEBAR.GOLDEN_FEATURE_SECRET_MANAGERS'),
    t('SIDEBAR.GOLDEN_FEATURE_PRIVATE_REGISTRY'),
    t('SIDEBAR.GOLDEN_FEATURE_REQUEST_FORMS'),
    t('SIDEBAR.GOLDEN_FEATURE_PRIORITY_SUPPORT')
  ], [t]);

  const [pricingOption, setPricingOption] = useState('individuals');

  const handlePricingOptionChange = (option) => {
    setPricingOption(option);
  };

  const themeBasedContainerClassNames = displayedTheme === 'light' ? 'text-gray-900' : 'text-white';
  const themeBasedTabContainerClassNames = displayedTheme === 'light' ? 'bg-gray-200' : 'bg-gray-800';
  const themeBasedActiveTabClassNames
    = displayedTheme === 'light' ? 'bg-white text-gray-900 font-medium' : 'bg-gray-700 text-white font-medium';

  return (
    <StyledWrapper>
      <Modal size="sm" title={t('SIDEBAR.GOLDEN_EDITION')} handleCancel={onClose} hideFooter={true}>
        <div className={`flex flex-col w-full ${themeBasedContainerClassNames}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{t('SIDEBAR.GOLDEN_EDITION')}</h3>
            <a
              onClick={() => {
                goldenEditionBuyClick();
                window.open('https://www.usebruno.com/pricing', '_blank');
              }}
              target="_blank"
              className="flex text-white bg-yellow-600 hover:bg-yellow-700 font-medium rounded-lg px-4 py-2 text-center cursor-pointer"
            >
              <IconHeart size={18} strokeWidth={1.5} /> <span className="ml-2">{t('SIDEBAR.BUY')}</span>
            </a>
          </div>
          {pricingOption === 'individuals' ? (
            <div>
              <div className="my-4">
                <span className="text-3xl font-extrabold">$19</span>
              </div>
              <p className="bg-yellow-200 text-black rounded-md px-2 py-1 mb-2 inline-flex">{t('SIDEBAR.ONE_TIME_PAYMENT')}</p>
              <p>{t('SIDEBAR.PERPETUAL_LICENSE_INDIVIDUAL')}</p>
            </div>
          ) : (
            <div>
              <div className="my-4">
                <span className="text-3xl font-extrabold">$49</span>
                <span className="ml-2">{t('SIDEBAR.PER_USER')}</span>
              </div>
              <p className="bg-yellow-200 text-black rounded-md px-2 py-1 mb-2 inline-flex">{t('SIDEBAR.ONE_TIME_PAYMENT')}</p>
              <p>{t('SIDEBAR.PERPETUAL_LICENSE_ORG')}</p>
            </div>
          )}
          <div
            className={`flex items-center justify-between my-8 w-40 rounded-full p-1 ${themeBasedTabContainerClassNames}`}
            style={{ width: '24rem' }}
          >
            <div
              className={`cursor-pointer w-1/2 h-8 flex items-center justify-center rounded-full ${
                pricingOption === 'individuals' ? themeBasedActiveTabClassNames : 'text-gray-500'
              }`}
              onClick={() => handlePricingOptionChange('individuals')}
            >
              <IconUser className="text-gray-500 mr-2 icon" size={16} strokeWidth={1.5} /> {t('SIDEBAR.INDIVIDUALS')}
            </div>
            <div
              className={`cursor-pointer w-1/2 h-8 flex items-center justify-center rounded-full ${
                pricingOption === 'organizations' ? themeBasedActiveTabClassNames : 'text-gray-500'
              }`}
              onClick={() => handlePricingOptionChange('organizations')}
            >
              <IconUsers className="text-gray-500 mr-2 icon" size={16} strokeWidth={1.5} /> {t('SIDEBAR.ORGANIZATIONS')}
            </div>
          </div>
          <ul role="list" className="space-y-3 text-left">
            <li className="flex items-center space-x-3">
              <HeartIcon />
              <span>{t('SIDEBAR.SUPPORT_BRUNO_DEVELOPMENT')}</span>
            </li>
            {pricingOption === 'individuals' ? (
              <>
                {goldenEditionIndividuals.map((item, index) => (
                  <li className="flex items-center space-x-3" key={index}>
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </>
            ) : (
              <>
                <li className="flex items-center space-x-3 pb-4">
                  <IconPlus size={16} strokeWidth={1.5} style={{ marginLeft: '2px' }} />
                  <span>{t('SIDEBAR.EVERYTHING_IN_INDIVIDUAL')}</span>
                </li>
                {goldenEditionOrganizations.map((item, index) => (
                  <li className="flex items-center space-x-3" key={index}>
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default GoldenEdition;
