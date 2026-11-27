import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import { pageBusyChanged } from 'providers/ReduxStore/slices/open-collection-modal';
import { closeOpenCollectionModal, openCollectionsFromModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';

const GitPage = () => {
  const dispatch = useDispatch();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleBusyChange = (busy) => {
    if (!busy && !mountedRef.current) {
      return;
    }
    dispatch(pageBusyChanged(busy));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 px-5">
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" data-testid="open-collection-git-panel">
        <CloneGitRepository
          variant="inline"
          onClose={() => dispatch(closeOpenCollectionModal())}
          onOpenCollections={(paths) => dispatch(openCollectionsFromModal(paths))}
          onBusyChange={handleBusyChange}
        />
      </div>
    </div>
  );
};

export default GitPage;
