import { cloneDeep } from 'lodash';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useState } from 'react';

const JSRuntime = ({ collection }) => {
  const dispatch = useDispatch();
  const runtime = collection?.brunoConfig?.security?.runtime;
  const appMode = collection?.brunoConfig?.security?.appMode;
  const [selectedRuntime, setSelectedRuntime] = useState(runtime || 'vm2');

  if (appMode === 'restricted') {
    return <div className="">No Runtime. Code Execution is blocked in restricted mode.</div>;
  }

  if (appMode === 'safe') {
    return <div className="">In Safe Mode the code execution happens isolated-vm runtime.</div>;
  }

  const handleRuntimeChange = (e) => {
    setSelectedRuntime(e.target.value);
  };

  const handleSave = () => {
    let brunoConfig = cloneDeep(collection.brunoConfig) || {};
    brunoConfig.security = {
      ...(brunoConfig?.security || {}),
      runtime: selectedRuntime
    };
    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success('JS Runtime updated successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update JS Runtime'));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs opacity-70">Choose the JavaScript runtime for this collection.</div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="node-vm" className="flex flex-row gap-2 cursor-pointer">
            <input
              type="radio"
              id="node-vm"
              name="runtime"
              value="node-vm"
              checked={selectedRuntime === 'node-vm'}
              // onChange={handleRuntimeChange}
              className="cursor-pointer opacity-50"
            />
            Node:VM
          </label>
          <label htmlFor="vm2" className="flex flex-row gap-2 cursor-pointer">
            <input
              type="radio"
              id="vm2"
              name="runtime"
              value="vm2"
              checked={selectedRuntime === 'vm2'}
              onChange={handleRuntimeChange}
              className="cursor-pointer"
            />
            VM2
          </label>
        </div>
        <button onClick={handleSave} className="submit btn btn-sm btn-secondary w-fit">
          Save
        </button>
      </div>
    </div>
  );
};

export default JSRuntime;
