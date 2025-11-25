import StyledWrapper from "./StyledWrapper";
import Docs from "../Docs";
import Info from "./Info";
import { IconBox } from '@tabler/icons';
import RequestsNotLoaded from "./RequestsNotLoaded";

const Overview = ({ collection }) => {
  return (
    <div className="h-full">
      <div className="grid grid-cols-5 gap-6 h-full">
        <div className="col-span-2 flex flex-col gap-6">
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