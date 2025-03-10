import StyledWrapper from "./StyledWrapper";
import Docs from "../Docs";
import Info from "./Info";
import { IconBox } from '@tabler/icons';
import RequestsNotLoaded from "./RequestsNotLoaded";

const Overview = ({ collection }) => {
  return (
    <div className="h-full">
      <div className="grid grid-cols-5 gap-4 h-full">
        <div className="col-span-2">
          <div className="text-xl font-semibold flex items-center gap-2">
            <IconBox size={24} stroke={1.5} />
            {collection?.name}
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
}

export default Overview;