import { useRef, useState } from 'react';
import { IconInfoCircle, IconX } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import { getLocalStorageValue, setLocalStorageValue } from 'utils/common/localStorage';
import { focusNextTabbable } from '../../../utils/focus';
import StyledWrapper from './StyledWrapper';

export const MY_COMPUTER_BANNER_DISMISSED_KEY = 'bruno.openCollection.myComputerBannerDismissed';

const SearchLocationsBanner = ({ onManage }) => {
  const [isDismissed, setIsDismissed] = useState(() => getLocalStorageValue(MY_COMPUTER_BANNER_DISMISSED_KEY, false, (stored) => stored === '1'));
  const banner = useRef(null);

  const dismiss = (event) => {
    focusNextTabbable(event.currentTarget, banner.current);
    setLocalStorageValue(MY_COMPUTER_BANNER_DISMISSED_KEY, '1');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <StyledWrapper ref={banner} role="region" aria-label="Find collections on this computer" data-testid="my-computer-banner">
      <IconInfoCircle size={16} strokeWidth={1.75} aria-hidden="true" />
      <div className="banner-text">
        <span className="banner-title">Showing collections from default and workspace folders</span>
        <span className="banner-sub">Add more folders to find other collections on this computer.</span>
      </div>
      <div className="banner-end">
        <button
          type="button"
          className="banner-action text-link hover:underline"
          onClick={onManage}
          data-testid="my-computer-banner-manage"
        >
          Manage locations
        </button>
        <ActionIcon
          type="button"
          size="sm"
          aria-label="Dismiss"
          title="Dismiss"
          onClick={dismiss}
          data-testid="my-computer-banner-dismiss"
        >
          <IconX size={14} strokeWidth={1.75} />
        </ActionIcon>
      </div>
    </StyledWrapper>
  );
};

export default SearchLocationsBanner;
