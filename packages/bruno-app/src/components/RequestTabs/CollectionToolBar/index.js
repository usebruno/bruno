import React from "react";
import { IconFiles } from "@tabler/icons";
import EnvironmentSelector from "components/Environments/EnvironmentSelector";
import StyledWrapper from "./StyledWrapper";

const CollectionToolBar = ({ collection }) => {
  return (
    <StyledWrapper>
      <div className="flex items-center p-2">
        <div className="flex flex-1 items-center">
          <IconFiles size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-semibold">{collection.name}</span>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <EnvironmentSelector collection={collection} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CollectionToolBar;
