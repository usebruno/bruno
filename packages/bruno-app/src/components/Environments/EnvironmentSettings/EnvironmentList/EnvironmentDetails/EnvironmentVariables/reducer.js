import produce from 'immer';
import find from 'lodash/find';
import filter from 'lodash/filter';
import { uuid } from 'utils/common';

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_VAR': {
      return produce(state, (draft) => {
        draft.variables.push({
          uid: uuid(),
          name: '',
          value: '',
          type: 'text',
          enabled: true
        });
        draft.hasChanges = true;
      });
    }

    case 'UPDATE_VAR': {
      return produce(state, (draft) => {
        const variable = find(draft.variables, (v) => v.uid === action.variable.uid);
        variable.name = action.variable.name;
        variable.value = action.variable.value;
        variable.enabled = action.variable.enabled;
        draft.hasChanges = true;
      });
    }

    case 'DELETE_VAR': {
      return produce(state, (draft) => {
        draft.variables = filter(draft.variables, (v) => v.uid !== action.variable.uid);
        draft.hasChanges = true;
      });
    }

    case 'CHANGES_SAVED': {
      return produce(state, (draft) => {
        draft.hasChanges = false;
      });
    }

    default: {
      return state;
    }
  }
};

export default reducer;
