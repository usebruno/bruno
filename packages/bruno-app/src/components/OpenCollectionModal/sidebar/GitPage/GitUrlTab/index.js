import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import { pageBusyChanged } from 'providers/ReduxStore/slices/open-collection-modal';
import { openCollectionsFromModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { GIT_PAGE_ID } from '../constants';

const GitUrlTab = ({ params, closeModal }) => {
  const dispatch = useDispatch();
  const mountedRef = useRef(true);
  const isPageHidden = useSelector((state) => state.openCollectionModal.page !== GIT_PAGE_ID);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleBusyChange = (busy) => {
    // A clone that ends after this tab closed must not clear a newer clone's busy state
    if (!busy && !mountedRef.current) {
      return;
    }
    dispatch(pageBusyChanged(busy));
  };

  return (
    <CloneGitRepository
      variant="inline"
      initialUrl={params.url}
      onClose={closeModal}
      onOpenCollections={(paths) => dispatch(openCollectionsFromModal(paths))}
      onBusyChange={handleBusyChange}
      isHidden={isPageHidden}
    />
  );
};

export default GitUrlTab;
