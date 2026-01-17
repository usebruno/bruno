import RequestMethod from '../RequestMethod';
import { IconLoader2, IconAlertTriangle, IconAlertCircle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollectionItemIcon = ({ item }) => {
  if (item?.error) {
    return <StyledWrapper><IconAlertCircle className="w-fit mr-2 error" size={18} strokeWidth={1.5} /></StyledWrapper>;
  }

  if (item?.loading) {
    return <IconLoader2 className="animate-spin w-fit mr-2" size={18} strokeWidth={1.5} />;
  }

  // If we have the request type, we can show the method icon
  // The RequestMethod component handles all types (HTTP, GraphQL, gRPC, WebSocket)
  // For HTTP requests, we extract the method during metadata parsing, so it should be available
  // For other types, the method isn't needed - just the type is sufficient
  const isRequestType = item?.type && ['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type);
  if (isRequestType) {
    return <RequestMethod item={item} />;
  }

  // Show warning only if we don't have enough information to display the icon
  // This should rarely happen, but provides a fallback
  if (item?.partial) {
    return <StyledWrapper><IconAlertTriangle size={18} className="w-fit mr-2 partial" strokeWidth={1.5} /></StyledWrapper>;
  }

  // Final fallback
  return <RequestMethod item={item} />;
};

export default CollectionItemIcon;
