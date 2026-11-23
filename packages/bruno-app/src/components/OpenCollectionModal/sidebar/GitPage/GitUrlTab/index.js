import { useDispatch } from 'react-redux';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import { pageBusyChanged } from 'providers/ReduxStore/slices/open-collection-modal';
import { openCollectionsFromModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';

const GitUrlTab = ({ params, closeModal }) => {
  const dispatch = useDispatch();
  return (
    <CloneGitRepository
      variant="inline"
      initialUrl={params.url}
      onClose={closeModal}
      onOpenCollections={(paths) => dispatch(openCollectionsFromModal(paths))}
      onBusyChange={(busy) => dispatch(pageBusyChanged(busy))}
    />
  );
};

export default GitUrlTab;
