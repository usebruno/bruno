import React, { useState, useEffect } from 'react';
import Modal from 'components/Modal/index';
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
      ></path>
    </svg>
  );
};

const GoldenEdition = ({ onClose }) => {
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

  const goldenEditonIndividuals = [
    'Inbuilt Bru File Explorer',
    'Visual Git (Like Gitlens for Vscode)',
    'GRPC, Websocket, SocketIO, MQTT',
    'Load Data from File for Collection Run',
    'Developer Tools',
    'OpenAPI Designer',
    'Performance/Load Testing',
    'Inbuilt Terminal',
    'Custom Themes'
  ];

  const goldenEditonOrganizations = [
    'Centralized License Management',
    'Integration with Secret Managers',
    'Private Collection Registry',
    'Request Forms',
    'Priority Support'
  ];

  const [pricingOption, setPricingOption] = useState('individuals');

  const handlePricingOptionChange = (option) => {
    setPricingOption(option);
  };

  const themeBasedContainerClassNames = displayedTheme === 'light' ? 'text-gray-900' : 'text-white';
  const themeBasedTabContainerClassNames = displayedTheme === 'light' ? 'bg-gray-200' : 'bg-gray-800';
  const themeBasedActiveTabClassNames =
    displayedTheme === 'light' ? 'bg-white text-gray-900 font-medium' : 'bg-gray-700 text-white font-medium';

  return (
    <StyledWrapper>
      <Modal size="sm" title={'Golden Edition'} handleCancel={onClose} hideFooter={true}>
        <div className={`flex flex-col w-full ${themeBasedContainerClassNames}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Golden Edition</h3>
            <a
              onClick={() => {
                goldenEditionBuyClick();
                window.open('https://www.usebruno.com/pricing', '_blank');
              }}
              target="_blank"
              className="flex text-white bg-yellow-600 hover:bg-yellow-700 font-medium rounded-lg text-sm px-4 py-2 text-center cursor-pointer"
            >
              <IconHeart size={18} strokeWidth={1.5} /> <span className="ml-2">Buy</span>
            </a>
          </div>
          {pricingOption === 'individuals' ? (
            <div>
              <div className="my-4">
                <span className="text-3xl font-extrabold">$19</span>
              </div>
              <p className="bg-yellow-200 text-black rounded-md px-2 py-1 mb-2 inline-flex text-sm">One Time Payment</p>
              <p className="text-sm">perpetual license for 2 devices, with 2 years of updates</p>
            </div>
          ) : (
            <div>
              <div className="my-4">
                <span className="text-3xl font-extrabold">$49</span>
                <span className="ml-2">/&nbsp;user</span>
              </div>
              <p className="bg-yellow-200 text-black rounded-md px-2 py-1 mb-2 inline-flex text-sm">One Time Payment</p>
              <p className="text-sm">perpetual license with 2 years of updates</p>
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
              <IconUser className="text-gray-500 mr-2 icon" size={16} strokeWidth={1.5} /> Individuals
            </div>
            <div
              className={`cursor-pointer w-1/2 h-8 flex items-center justify-center rounded-full ${
                pricingOption === 'organizations' ? themeBasedActiveTabClassNames : 'text-gray-500'
              }`}
              onClick={() => handlePricingOptionChange('organizations')}
            >
              <IconUsers className="text-gray-500 mr-2 icon" size={16} strokeWidth={1.5} /> Organizations
            </div>
          </div>
          <ul role="list" className="space-y-3 text-left">
            <li className="flex items-center space-x-3">
              <HeartIcon />
              <span>Support Bruno's Development</span>
            </li>
            {pricingOption === 'individuals' ? (
              <>
                {goldenEditonIndividuals.map((item, index) => (
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
                  <span>Everything in the Individual Plan</span>
                </li>
                {goldenEditonOrganizations.map((item, index) => (
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
