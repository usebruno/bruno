import React, { forwardRef, useCallback, useRef } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import { useTranslation } from 'react-i18next';
import Dropdown from 'components/Dropdown';
import { IconCaretDown } from '@tabler/icons';
import FilePickerEditor from 'components/FilePickerEditor';
import path from 'path';
import { isWindowsOS } from 'utils/common/platform';
import slash from 'utils/common/slash';

const OAuth1 = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { storedTheme } = useTheme();

  const oAuth1 = item.draft ? get(item, 'draft.request.auth.oauth1', {}) : get(item, 'request.auth.oauth1', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const refs = useRef(new Map());
  const setRef = useCallback((ref, key) => {
    if (ref) {
      refs.current.set(key, ref);
    } else {
      refs.current.delete(key);
    }
  }, []);

  const hideDropdown = (key) => {
    const dropdown = refs.current.get(key);
    if (dropdown?.hide) {
      dropdown.hide();
    }
  };

  const handleChange = (key, val) => {
    console.log(key, val);
    dispatch(
      updateAuth({
        mode: 'oauth1',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...oAuth1, [key]: val
        }
      })
    );
  };

  const relativeFile = (file) => {
    if (file) {
      if (isWindowsOS()) {
        return slash((path.win32.relative(collection.pathname, file)));
      } else {
        return path.posix.relative(collection.pathname, file);
      }
    } else {
      return '';
    }
  };

  const optionDisplayName = (options, key) => {
    const option = (options.find(option => option.key === key));
    return option?.label ? t(option.label) : key;
  };

  return (
    <StyledWrapper className="mt-2 flex w-full gap-4 flex-col">
      {inputsConfig.map((input) => {
        const { key, label, type, options } = input;
        return (
          <div className="flex flex-col w-full gap-1" key={`input-${key}`}>
            <label className="block font-medium">{t(label)}</label>
            {type === 'Dropdown' ?
              <div className="inline-flex items-center cursor-pointer grant-type-mode-selector w-fit">
                <Dropdown icon={(<div
                  className="flex items-center justify-end grant-type-label select-none">{optionDisplayName(options, oAuth1[key])}
                  <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} /></div>)}
                          onCreate={(ref) => setRef(ref, key)}
                          placement="bottom-end"
                          children={options.map((option) => (
                            <div
                              className="dropdown-item"
                              onClick={() => {
                                hideDropdown(key);
                                handleChange(key, option.key ? option.key : option);
                              }}>
                              {option.label ? t(option.label) : option}
                            </div>
                          ))}
                />
              </div>
              : ''}
            {type === 'SingleLineEditor' ?
              <div className="single-line-editor-wrapper">
                <SingleLineEditor
                  value={oAuth1[key] || ''}
                  theme={storedTheme}
                  onSave={handleSave}
                  onChange={(val) => handleChange(key, val)}
                  onRun={handleRun}
                  collection={collection}
                  item={item}
                />
              </div>
              : ''}
            {type === 'FilePickerEditor' ?
              <div className="file-picker-wrapper">
                <FilePickerEditor
                  value={[oAuth1[key]] || []}
                  onChange={(val) => handleChange(key, relativeFile(val[0]))}
                  collection={collection}
                />
              </div>
              : ''}
          </div>
        );
      })}
    </StyledWrapper>
  );
};

export default OAuth1;
