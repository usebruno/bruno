import { useSelector } from 'react-redux';
import ModalShell from './components/ModalShell';

const OpenCollectionModal = () => {
  const isOpen = useSelector((state) => state.openCollectionModal.isOpen);
  return isOpen ? <ModalShell /> : null;
};

export default OpenCollectionModal;
