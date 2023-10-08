import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isShow: false
};

export const docsSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    showDocs: (state) => {
      state.isShow = true;
    },
    closeDocs: (state) => {
      state.isShow = false;
    }
  }
});

export const { closeDocs, showDocs } = docsSlice.actions;

export default docsSlice.reducer;
