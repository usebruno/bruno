import { useDispatch } from "react-redux";
import React, { forwardRef, useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { IconPlus, IconCaretDown, IconTrash, IconAdjustmentsHorizontal } from '@tabler/icons';
import { cloneDeep } from "lodash";
import SingleLineEditor from "components/SingleLineEditor/index";
import StyledWrapper from "./StyledWrapper";
import Table from "components/Table/index";

const AdditionalParams  = ({ item = {}, request, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const oAuth = get(request, 'auth.oauth2', {});
  const {
    grantType,
    additionalParameters = {}
  } = oAuth;

  const [activeTab, setActiveTab] = useState(grantType == 'authorization_code' ? 'authorization' : 'token');

  const isEmptyParam = (param) => {
    return !param.name.trim() && !param.value.trim();
  };

  const hasEmptyRow = () => {
    const tabParams = additionalParameters[activeTab] || [];
    return tabParams.some(isEmptyParam);
  };

  const updateAdditionalParameters = ({ updatedAdditionalParameters }) => {
    const filteredParams = cloneDeep(updatedAdditionalParameters);
    
    Object.keys(filteredParams).forEach(paramType => {
      if (filteredParams[paramType]?.length) {
        filteredParams[paramType] = filteredParams[paramType].filter(param => 
          param.name.trim() || param.value.trim()
        );
        
        if (filteredParams[paramType].length === 0) {
          delete filteredParams[paramType];
        }
      } else if (Array.isArray(filteredParams[paramType]) && filteredParams[paramType].length === 0) {
        // Remove empty arrays
        delete filteredParams[paramType];
      }
    });

    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...oAuth,
          additionalParameters: Object.keys(filteredParams).length > 0 ? filteredParams : undefined
        }
      })
    );
  }

  const handleUpdateAdditionalParam = ({ paramType, key, paramIndex, value }) => {
    const updatedAdditionalParameters = cloneDeep(additionalParameters);
    
    if (!updatedAdditionalParameters[paramType]) {
      updatedAdditionalParameters[paramType] = [];
    }
    
    if (!updatedAdditionalParameters[paramType][paramIndex]) {
      updatedAdditionalParameters[paramType][paramIndex] = {
        name: '',
        value: '',
        sendIn: 'headers',
        enabled: true
      };
    }
    
    updatedAdditionalParameters[paramType][paramIndex][key] = value;
    
    // Only filter when updating a parameter
    updateAdditionalParameters({ updatedAdditionalParameters });
  }

  const handleDeleteAdditionalParam = ({ paramType, paramIndex }) => {
    const updatedAdditionalParameters = cloneDeep(additionalParameters);
    
    if (updatedAdditionalParameters[paramType]?.length) {
      updatedAdditionalParameters[paramType] = updatedAdditionalParameters[paramType].filter((_, index) => index !== paramIndex);
      
      // If the array is now empty, ensure we're not sending empty arrays
      if (updatedAdditionalParameters[paramType].length === 0) {
        delete updatedAdditionalParameters[paramType];
      }
    }
    
    updateAdditionalParameters({ updatedAdditionalParameters });
  }

  const handleAddNewAdditionalParam = () => {
    // Prevent adding multiple empty rows
    if (hasEmptyRow()) {
      return;
    }

    const paramType = activeTab;
    const localAdditionalParameters = cloneDeep(additionalParameters);
    
    if (!localAdditionalParameters[paramType]) {
      localAdditionalParameters[paramType] = [];
    }
    
    localAdditionalParameters[paramType] = [
      ...localAdditionalParameters[paramType],
      {
        name: '',
        value: '',
        sendIn: 'headers',
        enabled: true
      }
    ];
    
    // Don't filter here to allow the empty row to display in UI
    // But don't permanently store it in state until it has values
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...oAuth,
          additionalParameters: localAdditionalParameters,
        }
      })
    );
  }

  // Add a class to the Add Parameter button if it's disabled
  const addButtonDisabled = hasEmptyRow();

  return (
    <StyledWrapper className="mt-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center px-2.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-md">
          <IconAdjustmentsHorizontal size={14} className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          Additional Parameters
        </span>
      </div>
      
      <div className="tabs flex w-full gap-2 my-2">
        {grantType == 'authorization_code' && <div className={`tab ${activeTab == 'authorization' ? 'active': ''}`} onClick={e => setActiveTab('authorization')}>Authorization</div>}
        <div className={`tab ${activeTab == 'token' ? 'active': ''}`} onClick={e => setActiveTab('token')}>Token</div>
        <div className={`tab ${activeTab == 'refresh' ? 'active': ''}`} onClick={e => setActiveTab('refresh')}>Refresh</div>
      </div>
      <Table
        headers={[
          { name: 'Key', accessor: 'name', width: '30%' },
          { name: 'Value', accessor: 'value', width: '30%' },
          { name: 'Send In', accessor: 'sendIn', width: '150px' },
          { name: '', accessor: '', width: '15%' }
        ]}
      >
        <tbody>
          {(additionalParameters?.[activeTab] || []).map((param, index) => 
            <tr key={index}>
              <td className='flex relative'>
                <SingleLineEditor
                  value={param?.name || ''}
                  theme={storedTheme}
                  onChange={(value) => handleUpdateAdditionalParam({ 
                    paramType: activeTab,
                    key: 'name',
                    paramIndex: index,
                    value
                  })}
                  collection={collection}
                />
              </td>
              <td>
                <SingleLineEditor
                  value={param?.value || ''}
                  theme={storedTheme}
                  onChange={(value) => handleUpdateAdditionalParam({ 
                    paramType: activeTab,
                    key: 'value',
                    paramIndex: index,
                    value
                  })}
                  collection={collection}
                />
              </td>
              <td>
                <div className="w-full additional-parameter-sends-in-selector">
                  <select 
                    value={param?.sendIn || 'headers'} 
                    onChange={e => {
                      handleUpdateAdditionalParam({ 
                        paramType: activeTab,
                        key: 'sendIn',
                        paramIndex: index,
                        value: e.target.value
                      })
                    }} 
                    className="mousetrap bg-transparent"
                  >
                    {sendInOptionsMap[grantType || 'authorization_code'][activeTab].map((optionValue) => (
                      <option key={optionValue} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={param?.enabled ?? true}
                    tabIndex="-1"
                    className="mr-3 mousetrap"
                    onChange={(e) => {
                      handleUpdateAdditionalParam({ 
                        paramType: activeTab,
                        key: 'enabled',
                        paramIndex: index,
                        value: e.target.checked
                      })
                    }}
                  />
                  <button 
                    tabIndex="-1" 
                    onClick={() => {
                      handleDeleteAdditionalParam({
                        paramType: activeTab,
                        paramIndex: index
                      })
                    }}
                  >
                    <IconTrash strokeWidth={1.5} size={20} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <div 
        className={`add-additional-param-actions flex items-center mt-2 ${addButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
        onClick={addButtonDisabled ? null : handleAddNewAdditionalParam}
      >
        <IconPlus size={16} strokeWidth={1.5} style={{ marginLeft: '2px' }} />
        <span className="ml-1 text-sm text-gray-500">Add Parameter</span>
      </div>
    </StyledWrapper>
  )
}

export default AdditionalParams;

const Icon = forwardRef((props, ref) => {
  const { value } = props
  return (
    <div ref={ref} className="w-max textbox border p-2 rounded cursor-pointer flex items-center selector-label">
      <div className="flex-grow font-medium">
        {value}
      </div>
      <div>
        <IconCaretDown className="caret mx-2" size={14} strokeWidth={2} />
      </div>
    </div>
  );
});

const sendInOptionsMap = {
  'authorization_code': {
    'authorization': ['headers', 'queryparams'],
    'token': ['headers', 'queryparams', 'body'],
    'refresh': ['headers', 'queryparams', 'body']
  },
  'password': {
    'token': ['headers', 'queryparams', 'body'],
    'refresh': ['headers', 'queryparams', 'body']
  },
  'client_credentials': {
    'token': ['headers', 'queryparams', 'body'],
    'refresh': ['headers', 'queryparams', 'body']
  }
}