import { createPortal } from 'react-dom';

function Portal({ children, root = document.body }) {
  return createPortal(children, root);
}

export default Portal;
