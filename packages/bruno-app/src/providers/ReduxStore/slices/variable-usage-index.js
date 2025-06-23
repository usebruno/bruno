import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  variableUsageIndex: {}
};

const variableUsageIndexSlice = createSlice({
  name: 'variableUsageIndex',
  initialState,
  reducers: {
    updateVariableUsageIndex: (state, action) => {
      const { varKey, requestId, fieldPath } = action.payload;
      if (!state.variableUsageIndex[varKey]) {
        state.variableUsageIndex[varKey] = [];
      }
      const alreadyIndexed = state.variableUsageIndex[varKey].some(
        (ref) => ref.requestId === requestId && ref.fieldPath === fieldPath
      );
      if (!alreadyIndexed) {
        state.variableUsageIndex[varKey].push({ requestId, fieldPath });
      }
    },
    cleanupRequestReferences: (state, action) => {
      const { requestId } = action.payload;
      Object.keys(state.variableUsageIndex).forEach((varKey) => {
        state.variableUsageIndex[varKey] = state.variableUsageIndex[varKey].filter(
          (ref) => ref.requestId !== requestId
        );
        if (state.variableUsageIndex[varKey].length === 0) {
          delete state.variableUsageIndex[varKey];
        }
      });
    },
    setVariableUsageIndex: (state, action) => {
      state.variableUsageIndex = action.payload;
    }
  }
});

export const { updateVariableUsageIndex, setVariableUsageIndex, cleanupRequestReferences } =
  variableUsageIndexSlice.actions;

export default variableUsageIndexSlice.reducer;
