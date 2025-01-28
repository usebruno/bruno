import RequestMethod from "../RequestMethod";
import { IconLoader2, IconAlertTriangle, IconAlertCircle } from '@tabler/icons';
import StyledWrapper from "./StyledWrapper";

const CollectionItemIcon = ({ item }) => {
  if (item?.error) {
    return <StyledWrapper><IconAlertCircle className="w-fit mr-2 error" size={18} strokeWidth={1.5} /></StyledWrapper>;
  }

  if (item?.loading) {
    return <IconLoader2 className="animate-spin w-fit mr-2" size={18} strokeWidth={1.5} />;
  }

  if (item?.partial) {
    return <StyledWrapper><IconAlertTriangle size={18} className="w-fit mr-2 partial" strokeWidth={1.5} /></StyledWrapper>;
  }

  return <RequestMethod item={item} />;
};

export default CollectionItemIcon;