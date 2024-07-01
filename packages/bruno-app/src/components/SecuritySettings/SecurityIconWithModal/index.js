import { setShowAppModeModal } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { IconShieldLock } from '@tabler/icons';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { uuid } from 'utils/common/index';
import AppModeModal from './AppModeModal/index';

const SecuritySettingsIcon = ({ collection }) => {
  const showAppModeModel = collection?.showAppModeModal;
  const dispatch = useDispatch();

  const viewSecuritySettings = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'security-settings'
      })
    );
  };

  return (
    <>
      <IconShieldLock className="cursor-pointer" size={20} strokeWidth={1.5} onClick={viewSecuritySettings} />
      {showAppModeModel ? (
        <AppModeModal
          collection={collection}
          onClose={() => dispatch(setShowAppModeModal({ showAppModeModal: false, collectionUid: collection?.uid }))}
        />
      ) : null}
    </>
  );
};

export default SecuritySettingsIcon;
