import { createSlice } from '@reduxjs/toolkit';
import { requestCancelled, responseReceived } from './collections';

const MAX_STREAM_MESSAGES = 10000;

const streamMessagesSlice = createSlice({
  name: 'streamMessages',
  initialState: {},
  reducers: {
    streamMessagesReceived: (state, action) => {
      const { itemUid, items } = action.payload;
      if (!state[itemUid]) {
        state[itemUid] = { messages: [], size: 0 };
      }
      const entry = state[itemUid];
      for (const { seq, timestamp, data } of items) {
        if (data.data) {
          entry.messages.push({
            type: 'incoming',
            seq,
            message: data.data,
            timestamp: timestamp || Date.now()
          });
          entry.size += data.data?.length || 0;
        }
        if (data.dataBuffer) {
          entry.dataBufferChunks ||= [];
          entry.dataBufferChunks.push(Buffer.from(data.dataBuffer));
        }
      }
      // Evict oldest messages to bound memory
      if (entry.messages.length > MAX_STREAM_MESSAGES) {
        entry.messages.splice(0, entry.messages.length - MAX_STREAM_MESSAGES);
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(responseReceived, (state, action) => {
      const { itemUid, response } = action.payload;
      if (response?.stream) {
        delete state[itemUid];
      }
    });
    builder.addCase(requestCancelled, (state, action) => {
      const { itemUid, seq } = action.payload;
      if (state[itemUid]) {
        state[itemUid].messages.unshift({
          type: 'info',
          timestamp: Date.now(),
          seq,
          message: 'Connection Closed'
        });
      }
    });
  }
});

export const { streamMessagesReceived } = streamMessagesSlice.actions;
export default streamMessagesSlice.reducer;
