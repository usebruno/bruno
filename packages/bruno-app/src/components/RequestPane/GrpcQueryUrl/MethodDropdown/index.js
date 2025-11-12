import { IconChevronDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown/index';
import {
  IconGrpcBidiStreaming,
  IconGrpcClientStreaming,
  IconGrpcServerStreaming,
  IconGrpcUnary
} from 'components/Icons/Grpc';
import SearchInput from 'components/SearchInput/index';
import { search } from 'fast-fuzzy';
import React, { forwardRef, useEffect, useRef, useState } from 'react';

const MethodDropdown = ({
  grpcMethods,
  selectedGrpcMethod,
  onMethodSelect,
  onMethodDropdownCreate
}) => {

  const [searchText, setSearchText] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef();
  const listRef = useRef();

  useEffect(() => {
    const activeItem = listRef.current?.querySelector(`[data-index="${focusedIndex}"]`);
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const groupMethodsByService = (methods) => {
    if (!methods || !methods.length) return {};

    const groupedMethods = {};

    methods.forEach((method) => {
      const pathWithoutLeadingSlash = method.path.startsWith('/') ? method.path.slice(1) : method.path;
      const parts = pathWithoutLeadingSlash.split('/');
      const serviceName = parts[0] || 'Default';
      const methodName = parts[1] || method.path;

      const enhancedMethod = {
        ...method,
        serviceName,
        methodName
      };

      if (!groupedMethods[serviceName]) {
        groupedMethods[serviceName] = [];
      }

      groupedMethods[serviceName].push(enhancedMethod);
    });

    return groupedMethods;
  };

  const getIconForMethodType = (type) => {
    switch (type) {
      case 'unary':
        return <IconGrpcUnary size={20} strokeWidth={2} />;
      case 'client-streaming':
        return <IconGrpcClientStreaming size={20} strokeWidth={2} />;
      case 'server-streaming':
        return <IconGrpcServerStreaming size={20} strokeWidth={2} />;
      case 'bidi-streaming':
        return <IconGrpcBidiStreaming size={20} strokeWidth={2} />;
      default:
        return <IconGrpcUnary size={20} strokeWidth={2} />;
    }
  };

  const MethodsDropdownIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center ml-2 cursor-pointer select-none">
        {selectedGrpcMethod && <div className="mr-2">{getIconForMethodType(selectedGrpcMethod.type)}</div>}
        <span className="text-xs">
          {selectedGrpcMethod ? (
            <span className="dark:text-neutral-300 text-neutral-700 text-nowrap" data-testid="selected-grpc-method-name">
              {selectedGrpcMethod.path.split('.').at(-1) || selectedGrpcMethod.path}
            </span>
          ) : (
            <span className="dark:text-neutral-300 text-neutral-700 text-nowrap">Select Method </span>
          )}
        </span>
        <IconChevronDown className="caret ml-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleGrpcMethodSelect = (method) => {
    const methodType = method.type;
    onMethodSelect({ path: method.path, type: methodType });
  };

  const filteredMethods = searchText ? search(String(searchText), grpcMethods, { keySelector: (obj) => obj.path }) : grpcMethods;

  const groupedMethods = groupMethodsByService(filteredMethods);

  // Flatten grouped methods for keyboard navigation
  const flatMethodList = Object.values(groupedMethods).flat();

  const handleKeyDown = (e) => {
    if (!flatMethodList.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev < flatMethodList.length - 1 ? prev + 1 : flatMethodList.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev >= 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      handleGrpcMethodSelect(flatMethodList[focusedIndex]);
    }
  };

  const focusSearchInput = () => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0); // 0ms to ensure the dropdown is fully rendered and focused
  };

  const handleDropdownShow = () => {
    focusSearchInput();
    setSearchText('');
    setFocusedIndex(-1);
  };

  const handleSearchChange = (e) => {
    // auto focus the first method when the search input is not empty
    if (e.target.value.trim().length > 0) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(-1);
    }
  };

  if (!grpcMethods || grpcMethods.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center h-full mr-2" data-testid="grpc-methods-dropdown">
      <Dropdown onCreate={onMethodDropdownCreate} icon={<MethodsDropdownIcon />} placement="bottom-end" style={{ maxWidth: 'unset' }} onShow={handleDropdownShow}>
        <SearchInput
          searchText={searchText}
          setSearchText={setSearchText}
          placeholder="Search"
          ref={searchInputRef}
          onKeyDown={handleKeyDown}
          onBlur={focusSearchInput}
          onChange={handleSearchChange}
          className="mt-2 mb-3 "
          data-testid="grpc-methods-search-input"
        />
        <div ref={listRef} className="max-h-96 overflow-y-auto w-96 min-w-60" data-testid="grpc-methods-list">
          {Object.entries(groupedMethods).map(([serviceName, methods], serviceIndex) => (
            <div key={serviceIndex} className="service-group mb-2" onKeyDown={handleKeyDown} tabIndex={0}>
              <div className="service-header px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-sm font-medium truncate sticky top-0 z-10">
                {serviceName || 'Default Service'}
              </div>
              <div className="service-methods">
                {methods.map((method, methodIndex) => {
                  const globalMethodIndex
                    = Object.values(groupedMethods)
                      .slice(0, serviceIndex)
                      .reduce((acc, group) => acc + group.length, 0) + methodIndex;
                  return (
                    <div
                      key={`${serviceIndex}-${methodIndex}`}
                      className={`py-2 px-3 w-full border-l-2 transition-all duration-200 relative group ${
                        selectedGrpcMethod && selectedGrpcMethod.path === method.path
                          ? 'border-yellow-500 bg-yellow-500/20 dark:bg-yellow-900/20'
                          : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                      } ${focusedIndex === globalMethodIndex
                        ? 'bg-black/5 dark:bg-white/5' : ''}`}
                      onClick={() => handleGrpcMethodSelect(method)}
                      data-index={globalMethodIndex}
                      data-testid="grpc-method-item"
                    >
                      <div className="flex items-center">
                        <div className="text-xs mr-3 text-gray-500">
                          {getIconForMethodType(method.type)}
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {method.methodName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {method.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredMethods.length === 0 && (
            <div className="py-2 px-3 w-full transition-all duration-200 relative group">
              <div className="flex items-center">
                <div className="text-xs mr-3 text-gray-500">
                  No methods found for the search term
                </div>
              </div>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  );
};

export default MethodDropdown;
