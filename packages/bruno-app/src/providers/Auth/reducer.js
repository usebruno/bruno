import produce from "immer";

const reducer = (state, action) => {
  switch (action.type) {
    case "WHOAMI_SUCCESS": {
      return produce(state, (draft) => {
        draft.isLoading = false;
        draft.currentUser = action.user;
        draft.lastStateTransition = "WHOAMI_SUCCESS";
      });
    }

    case "WHOAMI_ERROR": {
      return produce(state, (draft) => {
        draft.isLoading = false;
        draft.currentUser = null;
        draft.lastStateTransition = "WHOAMI_ERROR";
      });
    }

    case "LOGIN_SUCCESS": {
      return produce(state, (draft) => {
        draft.isLoading = false;
        draft.currentUser = action.user;
        draft.lastStateTransition = "LOGIN_SUCCESS";
      });
    }

    case "LOGOUT_SUCCESS": {
      return produce(state, (draft) => {
        draft.isLoading = false;
        draft.currentUser = null;
        draft.lastStateTransition = "LOGOUT_SUCCESS";
      });
    }

    default: {
      return state;
    }
  }
};

export default reducer;
