// Insight State Management
// Tracks archived, tracked, and acknowledged insights

const INSIGHT_STATE_KEY = 'vitality_lens_insight_state';

export const getInsightState = () => {
  try {
    const state = localStorage.getItem(INSIGHT_STATE_KEY);
    return state ? JSON.parse(state) : {
      archived: [],
      tracked: [],
      acknowledged: []
    };
  } catch (error) {
    console.error('Error reading insight state:', error);
    return {
      archived: [],
      tracked: [],
      acknowledged: []
    };
  }
};

export const setInsightState = (state) => {
  try {
    localStorage.setItem(INSIGHT_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving insight state:', error);
  }
};

export const archiveInsight = (insightId) => {
  const state = getInsightState();
  if (!state.archived.includes(insightId)) {
    state.archived.push(insightId);
    setInsightState(state);
  }
};

export const unarchiveInsight = (insightId) => {
  const state = getInsightState();
  state.archived = state.archived.filter(id => id !== insightId);
  setInsightState(state);
};

export const trackInsight = (insightId) => {
  const state = getInsightState();
  if (!state.tracked.includes(insightId)) {
    state.tracked.push(insightId);
    setInsightState(state);
  }
};

export const untrackInsight = (insightId) => {
  const state = getInsightState();
  state.tracked = state.tracked.filter(id => id !== insightId);
  setInsightState(state);
};

export const acknowledgeInsight = (insightId) => {
  const state = getInsightState();
  if (!state.acknowledged.includes(insightId)) {
    state.acknowledged.push(insightId);
    setInsightState(state);
  }
};

export const isInsightArchived = (insightId) => {
  const state = getInsightState();
  return state.archived.includes(insightId);
};

export const isInsightTracked = (insightId) => {
  const state = getInsightState();
  return state.tracked.includes(insightId);
};

export const isInsightAcknowledged = (insightId) => {
  const state = getInsightState();
  return state.acknowledged.includes(insightId);
};

