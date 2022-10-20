import React from "react";
import { IconSend } from "@tabler/icons";
import StyledWrapper from "./StyledWrapper";

const Placeholder = () => {
  return (
    <StyledWrapper>
      <div className="text-gray-300 flex justify-center" style={{ fontSize: 200 }}>
        <IconSend size={150} strokeWidth={1} />
      </div>
      <div className="flex mt-4">
        <div className="flex flex-1 flex-col items-end px-1">
          <div className="px-1 py-2">Send Request</div>
          <div className="px-1 py-2">New Request</div>
          <div className="px-1 py-2">Edit Environments</div>
          <div className="px-1 py-2">Help</div>
        </div>
        <div className="flex flex-1 flex-col px-1">
          <div className="px-1 py-2">Cmd + Enter</div>
          <div className="px-1 py-2">Cmd + B</div>
          <div className="px-1 py-2">Cmd + E</div>
          <div className="px-1 py-2">Cmd + H</div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Placeholder;
