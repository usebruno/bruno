import { saveCollectionSecurityConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useState } from 'react';

const AppMode = ({ collection }) => {
  const dispatch = useDispatch();
  const [selectedAppMode, setSelectedAppMode] = useState(collection?.securityConfig?.appMode || 'developer');

  const handleAppModeChange = (e) => {
    setSelectedAppMode(e.target.value);
  };

  const handleSave = () => {
    dispatch(
      saveCollectionSecurityConfig(collection?.uid, {
        appMode: selectedAppMode,
        runtime: selectedAppMode === 'developer' ? 'vm2' : selectedAppMode === 'safe' ? 'isolated-vm' : undefined
      })
    )
      .then(() => {
        toast.success('App Mode updated successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update JS AppMode'));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs opacity-70">Choose the app mode for this collection.</div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="restricted" className="flex flex-row gap-2 cursor-pointer">
            <input
              type="radio"
              id="restricted"
              name="appMode"
              value="restricted"
              checked={selectedAppMode === 'restricted'}
              onChange={handleAppModeChange}
              className="cursor-pointer"
            />
            Restricted
          </label>
          <label htmlFor="safe" className="flex flex-row gap-2 cursor-pointer">
            <input
              type="radio"
              id="safe"
              name="appMode"
              value="safe"
              checked={selectedAppMode === 'safe'}
              onChange={handleAppModeChange}
              className="cursor-pointer"
            />
            Safe
          </label>
          <label htmlFor="developer" className="flex flex-row gap-2 cursor-pointer">
            <input
              type="radio"
              id="developer"
              name="appMode"
              value="developer"
              checked={selectedAppMode === 'developer'}
              onChange={handleAppModeChange}
              className="cursor-pointer"
            />
            Developer
          </label>
        </div>
        <button onClick={handleSave} className="submit btn btn-sm btn-secondary w-fit">
          Save
        </button>
      </div>
    </div>
  );
};

export default AppMode;
