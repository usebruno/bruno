import React from "react";
import Modal from "components/Modal/index";
import { IconSpeakerphone, IconBrandTwitter } from "@tabler/icons";
import StyledWrapper from "./StyledWrapper";
import GithubSvg from "assets/github.svg";

const BrunoSupport = ({ onClose }) => {
  return (
    <StyledWrapper>
      <Modal size="sm" title={"Support"} handleCancel={onClose} hideFooter={true}>
        <div className="collection-options">
          <div className="mt-2">
            <a href="https://github.com/usebruno/bruno/issues" target="_blank" className="flex items-center">
              <IconSpeakerphone size={18} strokeWidth={2} />
              <span className="label ml-2">Report Issues</span>
            </a>
          </div>
          <div className="mt-2">
            <a href="https://github.com/usebruno/bruno" target="_blank" className="flex items-center">
              <img src={GithubSvg.src} style={{ width: "18px" }} />
              <span className="label ml-2">Github</span>
            </a>
          </div>
          <div className="mt-2">
            <a href="https://twitter.com/use_bruno" target="_blank" className="flex items-center">
              <IconBrandTwitter size={18} strokeWidth={2} />
              <span className="label ml-2">Twitter</span>
            </a>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default BrunoSupport;
