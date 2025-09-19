import { createPortal } from 'react-dom';

function Portal({ children }) {
  return createPortal(children, document.body);
}
export default Portal;
