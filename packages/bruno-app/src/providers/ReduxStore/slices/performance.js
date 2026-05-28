import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  systemResources: {
    cpu: 0,
    memory: 0,
    pid: null,
    uptime: 0,
    lastUpdated: null
  }
};

export const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    updateSystemResources: (state, action) => {
      state.systemResources = {
        ...state.systemResources,
        ...action.payload,
        lastUpdated: new Date().toISOString()
      };
    }
  }
});

export const { updateSystemResources } = performanceSlice.actions;
export default performanceSlice.reducer;
