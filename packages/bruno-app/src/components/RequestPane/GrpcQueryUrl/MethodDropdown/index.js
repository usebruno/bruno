import React, { forwardRef } from 'react';
import { IconChevronDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown/index';
import {
  IconGrpcUnary,
  IconGrpcClientStreaming,
  IconGrpcServerStreaming,
  IconGrpcBidiStreaming,
} from 'components/Icons/Grpc';

const MethodDropdown = ({
  grpcMethods,
  selectedGrpcMethod,
  onMethodSelect,
  onMethodDropdownCreate,
}) => {
  const groupMethodsByService = methods => {
    if (!methods || !methods.length) return {};

    const groupedMethods = {};

    methods.forEach(method => {
      const pathWithoutLeadingSlash = method.path.startsWith('/') ? method.path.slice(1) : method.path;
      const parts = pathWithoutLeadingSlash.split('/');
      const serviceName = parts[0] || 'Default';
      const methodName = parts[1] || method.path;

      const enhancedMethod = {
        ...method,
        serviceName,
        methodName,
      };

      if (!groupedMethods[serviceName]) {
        groupedMethods[serviceName] = [];
      }

      groupedMethods[serviceName].push(enhancedMethod);
    });

    return groupedMethods;
  };

  const getIconForMethodType = type => {
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
            <span className="dark:text-neutral-300 text-neutral-700 text-nowrap">
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

  const handleGrpcMethodSelect = method => {
    const methodType = method.type;
    onMethodSelect({ path: method.path, type: methodType });
  };

  if (!grpcMethods || grpcMethods.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center h-full mr-2" data-testid="grpc-methods-dropdown">
      <Dropdown onCreate={onMethodDropdownCreate} icon={<MethodsDropdownIcon />} placement="bottom-end" style={{ maxWidth: 'unset' }}>
        <div className="max-h-96 overflow-y-auto max-w-96 min-w-60" data-testid="grpc-methods-list">
          {Object.entries(groupMethodsByService(grpcMethods)).map(([serviceName, methods], serviceIndex) => (
            <div key={serviceIndex} className="service-group mb-2">
              <div className="service-header px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-sm font-medium truncate sticky top-0 z-10">
                {serviceName || 'Default Service'}
              </div>
              <div className="service-methods">
                {methods.map((method, methodIndex) => (
                  <div
                    key={`${serviceIndex}-${methodIndex}`}
                    className={`py-2 px-3 w-full border-l-2 transition-all duration-200 relative group ${
                      selectedGrpcMethod && selectedGrpcMethod.path === method.path
                        ? 'border-yellow-500 bg-yellow-500/20 dark:bg-yellow-900/20'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    onClick={() => handleGrpcMethodSelect(method)}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      </Dropdown>
    </div>
  );
};

export default MethodDropdown;
