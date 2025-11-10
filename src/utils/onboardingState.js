// Onboarding State Management
// Tracks user onboarding completion and preferences

const ONBOARDING_KEY = 'vitality_lens_onboarding';

export const getOnboardingState = () => {
  try {
    const state = localStorage.getItem(ONBOARDING_KEY);
    return state ? JSON.parse(state) : {
      completed: false,
      step: 0,
      skipped: false,
      completedDate: null
    };
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return {
      completed: false,
      step: 0,
      skipped: false,
      completedDate: null
    };
  }
};

export const setOnboardingState = (state) => {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
};

export const markOnboardingComplete = () => {
  setOnboardingState({
    completed: true,
    step: 3,
    skipped: false,
    completedDate: new Date().toISOString()
  });
};

export const skipOnboarding = () => {
  setOnboardingState({
    completed: true,
    step: 3,
    skipped: true,
    completedDate: new Date().toISOString()
  });
};

export const resetOnboarding = () => {
  localStorage.removeItem(ONBOARDING_KEY);
};

export const updateOnboardingStep = (step) => {
  const currentState = getOnboardingState();
  setOnboardingState({
    ...currentState,
    step
  });
};

