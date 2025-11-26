import { useState } from 'react';
import StyledWrapper from "./StyledWrapper";
import Docs from "../Docs";
import Info from "./Info";
import RequestsNotLoaded from "./RequestsNotLoaded";

const Overview = ({ collection }) => {
  const [isDocsExpanded, setIsDocsExpanded] = useState(false);

  const toggleDocsExpand = () => {
    setIsDocsExpanded((prev) => !prev);
  };

  return (
    <StyledWrapper $isDocsExpanded={isDocsExpanded}>
      <div className="overview-flex">
        <div className={`overview-left ${isDocsExpanded ? 'collapsed' : ''}`}>
          <div className="overview-card">
            <Info collection={collection} isCollapsed={isDocsExpanded} onExpand={toggleDocsExpand} />
            {!isDocsExpanded && <RequestsNotLoaded collection={collection} />}
          </div>
        </div>
        <div className="overview-right">
          <Docs collection={collection} isExpanded={isDocsExpanded} onToggleExpand={toggleDocsExpand} />
        </div>
      </div>
    </StyledWrapper>
  );
}

export default Overview;