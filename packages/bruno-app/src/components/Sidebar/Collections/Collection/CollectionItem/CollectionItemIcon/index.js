import { FileIcon } from 'react-file-icon';
import path from "path";
import Bruno from 'components/Bruno/index';

const CollectionItemIcon = ({ filename, className }) => {
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

export default CollectionItemIcon;