import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import { openCollectionsFromModal, setPageBusy } from 'providers/ReduxStore/slices/open-collection-modal/actions';

const GitUrlTab = ({ params, closeModal }) => {
  const dispatch = useDispatch();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleBusyChange = (busy) => {
    // A clone outliving this tab must not free a page a newer clone holds busy
    if (!busy && !mountedRef.current) {
      return;
    }
    dispatch(setPageBusy(busy));
  };

  return (
    <CloneGitRepository
      variant="inline"
      initialUrl={params.url}
      onClose={closeModal}
      onOpenCollections={(paths) => dispatch(openCollectionsFromModal(paths))}
      onBusyChange={handleBusyChange}
    />
  );
};

export default GitUrlTab;
