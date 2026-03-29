import { createSlice } from '@reduxjs/toolkit';
import { savePreferences } from './app';

/**
 * Onboarding Redux Slice
 * Manages the state for guided onboarding tours
 */

const initialState = {
  // Currently active guide (null if none active)
  activeGuideId: null,
  // Current step index in active guide
  currentStepIndex: 0,
  // Set of completed guide IDs
  completedGuides: [],
  // Whether onboarding overlay is visible
  isActive: false,
  // Pause state (for when modals open, etc.)
  isPaused: false
};

export const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    startGuide: (state, action) => {
      const { guideId } = action.payload;
      state.activeGuideId = guideId;
      state.currentStepIndex = 0;
      state.isActive = true;
      state.isPaused = false;
    },

    nextStep: (state) => {
      state.currentStepIndex += 1;
    },

    previousStep: (state) => {
      if (state.currentStepIndex > 0) {
        state.currentStepIndex -= 1;
      }
    },

    goToStep: (state, action) => {
      state.currentStepIndex = action.payload.stepIndex;
    },

    completeGuide: (state) => {
      if (state.activeGuideId && !state.completedGuides.includes(state.activeGuideId)) {
        state.completedGuides.push(state.activeGuideId);
      }
      state.activeGuideId = null;
      state.currentStepIndex = 0;
      state.isActive = false;
      state.isPaused = false;
    },

    exitGuide: (state) => {
      state.activeGuideId = null;
      state.currentStepIndex = 0;
      state.isActive = false;
      state.isPaused = false;
    },

    pauseGuide: (state) => {
      state.isPaused = true;
    },

    resumeGuide: (state) => {
      state.isPaused = false;
    },

    resetGuideProgress: (state, action) => {
      const { guideId } = action.payload;
      state.completedGuides = state.completedGuides.filter((id) => id !== guideId);
    },

    loadCompletedGuides: (state, action) => {
      state.completedGuides = action.payload.completedGuides || [];
    }
  }
});

export const {
  startGuide,
  nextStep,
  previousStep,
  goToStep,
  completeGuide,
  exitGuide,
  pauseGuide,
  resumeGuide,
  resetGuideProgress,
  loadCompletedGuides
} = onboardingSlice.actions;

// Selectors
export const selectActiveGuideId = (state) => state.onboarding.activeGuideId;
export const selectCurrentStepIndex = (state) => state.onboarding.currentStepIndex;
export const selectCompletedGuides = (state) => state.onboarding.completedGuides;
export const selectIsOnboardingActive = (state) => state.onboarding.isActive;
export const selectIsOnboardingPaused = (state) => state.onboarding.isPaused;

// Thunk to complete guide and persist to preferences
export const completeGuideAndPersist = () => (dispatch, getState) => {
  dispatch(completeGuide());
  const state = getState();
  const completedGuides = state.onboarding.completedGuides;
  const preferences = state.app.preferences;

  const updatedPreferences = {
    ...preferences,
    onboarding: {
      ...preferences.onboarding,
      completedGuides
    }
  };

  return dispatch(savePreferences(updatedPreferences));
};

// Thunk to reset guide progress and persist
export const resetGuideProgressAndPersist = (guideId) => (dispatch, getState) => {
  dispatch(resetGuideProgress({ guideId }));
  const state = getState();
  const completedGuides = state.onboarding.completedGuides;
  const preferences = state.app.preferences;

  const updatedPreferences = {
    ...preferences,
    onboarding: {
      ...preferences.onboarding,
      completedGuides
    }
  };

  return dispatch(savePreferences(updatedPreferences));
};

export default onboardingSlice.reducer;
