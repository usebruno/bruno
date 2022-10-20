import React, { useRef, forwardRef } from "react";
import get from "lodash/get";
import { IconCaretDown } from "@tabler/icons";
import Dropdown from "components/Dropdown";
import { useDispatch } from "react-redux";
import { updateRequestBodyMode } from "providers/ReduxStore/slices/collections";
import { humanizeRequestBodyMode } from "utils/collections";
import StyledWrapper from "./StyledWrapper";

const RequestBodyMode = ({ item, collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const bodyMode = item.draft ? get(item, "draft.request.body.mode") : get(item, "request.body.mode");

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none">
        {humanizeRequestBodyMode(bodyMode)} <IconCaretDown className="caret ml-2 mr-2" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onModeChange = (value) => {
    dispatch(
      updateRequestBodyMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: value,
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="label-item font-medium">Form</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange("multipartForm");
            }}
          >
            Multipart Form
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange("formUrlEncoded");
            }}
          >
            Form Url Encoded
          </div>
          <div className="label-item font-medium">Raw</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange("json");
            }}
          >
            JSON
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange("xml");
            }}
          >
            XML
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange("text");
            }}
          >
            TEXT
          </div>
          <div className="label-item font-medium">Other</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange("none");
            }}
          >
            No Body
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default RequestBodyMode;
