import { configureStore } from '@reduxjs/toolkit';
import appReducer, {
  toggleVariablesSidebar,
  closeVariablesSidebar,
  showVariablesSidebar,
  showAiSidebar
} from './app';
import chatReducer, { openAiSidebar, popOutAiChat } from './chat';

const createStore = () => configureStore({
  reducer: { app: appReducer, chat: chatReducer }
});

describe('variables sidebar', () => {
  it('opens and closes with toggleVariablesSidebar', () => {
    const store = createStore();

    store.dispatch(toggleVariablesSidebar());
    expect(store.getState().app.isVariablesSidebarOpen).toBe(true);

    store.dispatch(toggleVariablesSidebar());
    expect(store.getState().app.isVariablesSidebarOpen).toBe(false);
  });

  it('closes the docked AI sidebar when it opens', () => {
    const store = createStore();
    store.dispatch(openAiSidebar());

    store.dispatch(showVariablesSidebar());

    expect(store.getState().app.isVariablesSidebarOpen).toBe(true);
    expect(store.getState().chat.isOpen).toBe(false);
  });

  it('keeps a popped-out AI chat open when it opens', () => {
    const store = createStore();
    store.dispatch(openAiSidebar());
    store.dispatch(popOutAiChat());

    store.dispatch(showVariablesSidebar());

    expect(store.getState().app.isVariablesSidebarOpen).toBe(true);
    expect(store.getState().chat.isOpen).toBe(true);
    expect(store.getState().chat.isPoppedOut).toBe(true);
  });

  it('closes when the AI sidebar is shown docked', () => {
    const store = createStore();
    store.dispatch(showVariablesSidebar());

    store.dispatch(showAiSidebar());

    expect(store.getState().chat.isOpen).toBe(true);
    expect(store.getState().app.isVariablesSidebarOpen).toBe(false);
  });

  it('docks a popped-out AI chat when it is shown from the sidebar switch', () => {
    const store = createStore();
    store.dispatch(openAiSidebar());
    store.dispatch(popOutAiChat());

    store.dispatch(showAiSidebar());

    expect(store.getState().chat.isOpen).toBe(true);
    expect(store.getState().chat.isPoppedOut).toBe(false);
  });

  it('closes with closeVariablesSidebar', () => {
    const store = createStore();
    store.dispatch(toggleVariablesSidebar());

    store.dispatch(closeVariablesSidebar());

    expect(store.getState().app.isVariablesSidebarOpen).toBe(false);
  });
});
