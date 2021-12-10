import React from 'react';
import Collections from './Collections';
import Navbar from '../Navbar';
import { IconDatabase, IconSearch } from '@tabler/icons';

const Sidebar = ({collections, actions, dispatch, activeRequestTabId}) => {
  return (
    <aside>
      <Navbar />
      <div className="mt-4 px-2 flex">
        <IconDatabase size={20} strokeWidth={1.5}/>
        <span className="ml-1">No Environment</span>
      </div>

      <div className="mt-4 relative collection-filter px-2">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">
            <IconSearch size={16} strokeWidth={1.5}/>
          </span>
        </div>
        <input
          type="text"
          name="price"
          id="price"
          className="block w-full pl-7 py-1 sm:text-sm"
          placeholder="search"
        />
      </div>

      <Collections
        collections={collections}
        actions={actions}
        dispatch={dispatch}
        activeRequestTabId={activeRequestTabId}
      />
    </aside>
  );
};

export default Sidebar;