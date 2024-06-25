import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useState } from 'react';
import { cloneDeep } from 'lodash';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';

const CodeExecution = ({ collection }) => {
  const dispatch = useDispatch();
  const [enableCodeExecution, setEnableCodeExecution] = useState(
    collection?.brunoConfig?.security?.codeExecution || false
  );

  console.log(enableCodeExecution);

  const handleSave = () => {
    let brunoConfig = cloneDeep(collection.brunoConfig) || {};
    brunoConfig.security = {
      ...(brunoConfig?.security || {}),
      codeExecution: enableCodeExecution
    };
    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success('JS Runtime updated successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update JS Runtime'));
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <div className="text-xs flex flex-row">
            <div className="opacity-70">Security warning:</div>{' '}
            <div className="opacity-70">
              The collection may contain pre/post-request scripts. Those scripts might perform unexpected actions that
              could harm your computer. The following parts of the collection have the ability to execute code via JS
              expressions or scripts.
            </div>
          </div>
          <ul className="text-xs mt-2 flex flex-col gap-1 list-disc pl-4 opacity-70">
            <li>Environment Variables</li>
            <li>Pre-request Scripts</li>
            <li>Post Response Sripts</li>
            <li>Tests</li>
          </ul>
        </div>
        <label htmlFor="code-execution" className="flex flex-row gap-2 items-center mt-2 cursor-pointer">
          <input
            type="checkbox"
            id="code-execution"
            name="code-execution"
            className="cursor-pointer"
            checked={enableCodeExecution}
            onChange={() => setEnableCodeExecution(!enableCodeExecution)}
          />
          Enable Code Execution
        </label>
        <button onClick={handleSave} className="submit btn btn-sm btn-secondary w-fit">
          Save
        </button>
      </div>
    </div>
  );
};

export default CodeExecution;
