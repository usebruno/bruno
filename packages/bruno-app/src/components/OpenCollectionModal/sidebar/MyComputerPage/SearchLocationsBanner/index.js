import { useRef, useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons';
import Button from 'ui/Button';
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
      <IconSearch size={15} strokeWidth={1.75} aria-hidden="true" />
      <p className="banner-text">
        This list shows collections Bruno finds in your default collection location and workspace folders. Add more folders, or search your whole computer, to find the rest.
      </p>
      <Button size="sm" color="secondary" className="banner-action" onClick={onManage} data-testid="my-computer-banner-manage">
        Manage locations
      </Button>
      <button
        type="button"
        className="banner-dismiss"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={dismiss}
        data-testid="my-computer-banner-dismiss"
      >
        <IconX size={12} strokeWidth={2} />
      </button>
    </StyledWrapper>
  );
};

export default SearchLocationsBanner;
