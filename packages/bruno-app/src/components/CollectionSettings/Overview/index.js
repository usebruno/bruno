import StyledWrapper from './StyledWrapper';
import Docs from '../Docs';
import Info from './Info';
import { IconBox } from '@tabler/icons';
import RequestsNotLoaded from './RequestsNotLoaded';

const Overview = ({ collection }) => {
  return (
    <div className="h-full">
      <div className="grid grid-cols-5 gap-5 h-full">
        <div className="col-span-2 overflow-clip text-ellipsis">
          <div className="flex gap-2 items-center min-w-0">
            <IconBox size={20} stroke={1.5} className="flex-shrink-0" />
            <span className="overflow-hidden text-lg font-medium whitespace-nowrap text-ellipsis">
              {collection?.name}
            </span>
          </div>
          <Info collection={collection} />
          <RequestsNotLoaded collection={collection} />
        </div>
        <div className="col-span-3">
          <Docs collection={collection} />
        </div>
      </div>
    </div>
  );
};

export default Overview;
