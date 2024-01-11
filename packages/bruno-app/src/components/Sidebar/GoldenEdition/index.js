import React, { useState, useEffect } from 'react';
import Modal from 'components/Modal/index';
import { PostHog } from 'posthog-node';
import { uuid } from 'utils/common';
import platformLib from 'platform';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme/index';
import { Check, Heart, User, Users } from 'lucide-react';

let posthogClient = null;
const posthogApiKey = 'phc_7gtqSrrdZRohiozPMLIacjzgHbUlhalW1Bu16uYijMR';
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

const GoldenEdition = ({ onClose }) => {
  const { storedTheme } = useTheme();

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

  const goldenEditon = [
    'Inbuilt Bru File Explorer',
    'Visual Git (Like Gitlens for Vscode)',
    'GRPC, Websocket, SocketIO, MQTT',
    'Intergration with Secret Managers',
    'Load Data from File for Collection Run',
    'Developer Tools',
    'OpenAPI Designer',
    'Performance/Load Testing',
    'Inbuilt Terminal',
    'Custom Themes'
  ];

  const [pricingOption, setPricingOption] = useState('individuals');

  const handlePricingOptionChange = (option) => {
    setPricingOption(option);
  };

  const themeBasedContainerClassNames = storedTheme === 'light' ? 'text-gray-900' : 'text-white';
  const themeBasedTabContainerClassNames = storedTheme === 'light' ? 'bg-gray-200' : 'bg-gray-800';
  const themeBasedActiveTabClassNames =
    storedTheme === 'light' ? 'bg-white text-gray-900 font-medium' : 'bg-gray-700 text-white font-medium';

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
              <Heart size={18} strokeWidth={1.5} />
              <span className="ml-2">{pricingOption === 'individuals' ? 'Buy' : 'Subscribe'}</span>
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
                <span className="text-3xl font-extrabold">$2</span>
              </div>
              <p>/user/month</p>
            </div>
          )}
          <div
            className={`flex items-center justify-between my-8 w-40 rounded-full p-1 ${themeBasedTabContainerClassNames}`}
            style={{ width: '24rem' }}
          >
            <div
              className={`cursor-pointer w-1/2 h-8 flex items-center justify-center rounded-full ${
                pricingOption === 'individuals' ? themeBasedActiveTabClassNames : 'text-slate-500'
              }`}
              onClick={() => handlePricingOptionChange('individuals')}
            >
              <User className="mr-2 icon" size={16} /> Individuals
            </div>
            <div
              className={`cursor-pointer w-1/2 h-8 flex items-center justify-center rounded-full ${
                pricingOption === 'organizations' ? themeBasedActiveTabClassNames : 'text-slate-500'
              }`}
              onClick={() => handlePricingOptionChange('organizations')}
            >
              <Users className="mr-2 icon" size={16} /> Organizations
            </div>
          </div>
          <ul role="list" className="space-y-3 text-left">
            <li className="flex items-center space-x-3">
              <Heart className="fill-amber-500 text-amber-500" size={18} strokeWidth={0} />
              <span>Support Bruno's Development</span>
            </li>
            {goldenEditon.map((item, index) => (
              <li className="flex items-center space-x-3" key={index}>
                <Check className="text-green-500" size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default GoldenEdition;
