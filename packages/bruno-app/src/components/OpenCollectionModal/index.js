import { useSelector } from 'react-redux';
import ImportHandoff from './components/ImportHandoff';
import ModalShell from './components/ModalShell';

const OpenCollectionModal = () => {
  const isOpen = useSelector((state) => state.openCollectionModal.isOpen);
  return <ImportHandoff>{isOpen ? <ModalShell /> : null}</ImportHandoff>;
};

export default OpenCollectionModal;
