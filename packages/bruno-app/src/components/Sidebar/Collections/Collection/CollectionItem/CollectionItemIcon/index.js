import { FileIcon } from 'react-file-icon';
import path from "path";
import Bruno from 'components/Bruno/index';
import RequestMethod from "../RequestMethod";
import { IconLoader2, IconAlertTriangle, IconAlertCircle } from '@tabler/icons';
import StyledWrapper from "./StyledWrapper";


const ItemExtIcon = ({ filename, className }) => {
  const extname = path.extname(filename)?.slice(1,);

  switch(extname) {
    case 'bru': 
      return <Bruno width={20} className="min-w-[1.25rem] mr-1" />;
      break;
    default: 
      return <div className={`w-[12px] max-w-[14px] max-h-[14px] ml-[0.25rem] ${className} mr-[8px]`}>
        <FileIcon 
          size={15}
          extension={extname} 
          color="#D14423"
          labelColor="#D14423"
          labelUppercase
          labelTextStyle
          type="image"
          glyphColor="rgba(255,255,255,0.4)"
          className={className}
        />
      </div>;
      break;
  }
}

const CollectionItemIcon = ({ collection, item }) => {
  const isCollectionInFileMode = collection?.fileMode;

  if (item?.error) {
    return <StyledWrapper><IconAlertCircle className="w-fit mr-2 error" size={18} strokeWidth={1.5} /></StyledWrapper>;
  }

  if (item?.loading) {
    return <IconLoader2 className="animate-spin w-fit mr-2" size={18} strokeWidth={1.5} />;
  }

  if (item?.partial) {
    return <StyledWrapper><IconAlertTriangle size={18} className="w-fit mr-2 partial" strokeWidth={1.5} /></StyledWrapper>;
  }

  if (isCollectionInFileMode && item?.type !== 'folder') {
    return <ItemExtIcon className="mr-1" filename={item?.filename} />;
  }

  return <RequestMethod item={item} />;
};

export default CollectionItemIcon;