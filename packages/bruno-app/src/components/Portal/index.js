import { createPortal } from 'react-dom';

function Portal({ children, wrapperId }) {
  wrapperId = wrapperId || 'bruno-app-body';

  return createPortal(children, document.getElementById(wrapperId));
}
export default Portal;
