import StyledWrapper from './StyledWrapper';
import Docs from './Docs';
import Info from './Info';
import { IconFolder } from '@tabler/icons';

const Overview = ({ collection, folder }) => {
  return (
    <div className="h-full">
      <div className="grid grid-cols-5 gap-5 h-full">
        <div className="col-span-2">
          <div className="text-lg font-medium flex items-center gap-2">
            <IconFolder size={20} stroke={1.5} />
            {folder?.name}
          </div>
          <Info collection={collection} folder={folder} />
        </div>
        <div className="col-span-3">
          <Docs collection={collection} folder={folder} />
        </div>
      </div>
    </div>
  );
};

export default Overview;
