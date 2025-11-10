// AI Response Cache Utility
// Caches AI-generated content to avoid regenerating the same responses

const CACHE_PREFIX = 'ai_cache_';
const CACHE_VERSION = '1.0';
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Track session start time - cache entries created before this are invalid (page refresh)
// This is set on each page load, so refresh = new session = cache invalidated
let SESSION_START_TIME = null;

// Initialize session start time on module load (happens on each page refresh)
if (typeof window !== 'undefined') {
  // Check if this is a page refresh by looking at navigation type
  const navEntry = performance.getEntriesByType('navigation')[0];
  const isPageRefresh = navEntry && (navEntry.type === 'reload' || navEntry.type === 'navigate');
  
  // Get stored session start time
  const storedSessionStart = sessionStorage.getItem('ai_cache_session_start');
  
  if (isPageRefresh || !storedSessionStart) {
    // Page refresh or first load - set new session time (invalidates old cache)
    SESSION_START_TIME = Date.now();
    sessionStorage.setItem('ai_cache_session_start', SESSION_START_TIME.toString());
  } else {
    // SPA navigation (tab switch) - use existing session time (keep cache)
    SESSION_START_TIME = parseInt(storedSessionStart, 10);
  }
}

// Generate a cache key from function name and parameters
const generateCacheKey = (functionName, params) => {
  // Create a stable key from function name and relevant parameters
  const keyParts = [functionName, CACHE_VERSION];
  
  // Add date if present
  if (params.date) {
    const dateStr = typeof params.date === 'string' 
      ? params.date 
      : params.date instanceof Date 
        ? params.date.toISOString().split('T')[0]
        : String(params.date);
    keyParts.push(dateStr);
  }
  
  // Add selectedDate if present
  if (params.selectedDate) {
    const dateStr = typeof params.selectedDate === 'string' 
      ? params.selectedDate 
      : params.selectedDate instanceof Date 
        ? params.selectedDate.toISOString().split('T')[0]
        : String(params.selectedDate);
    keyParts.push(dateStr);
  }
  
  // Add endDate if present
  if (params.endDate) {
    const dateStr = typeof params.endDate === 'string' 
      ? params.endDate 
      : params.endDate instanceof Date 
        ? params.endDate.toISOString().split('T')[0]
        : String(params.endDate);
    keyParts.push(dateStr);
  }
  
  // Add other relevant parameters
  if (params.currentScore !== undefined) keyParts.push(`score_${params.currentScore}`);
  if (params.targetScore !== undefined) keyParts.push(`target_${params.targetScore}`);
  if (params.focusArea) keyParts.push(`focus_${params.focusArea}`);
  if (params.question) {
    // Use a hash of the question for cache key
    const questionHash = params.question.toLowerCase().trim().substring(0, 50);
    keyParts.push(`q_${questionHash}`);
  }
  
  // For correlation-based functions, include correlation identifier
  if (params.correlation) {
    const corrId = `${params.correlation.metric1}_${params.correlation.metric2}_${params.correlation.correlation?.toFixed(2)}`;
    keyParts.push(corrId);
  }
  
  // For anomaly-based functions, include anomaly identifier
  if (params.anomaly) {
    const anomalyId = `${params.anomaly.metricName}_${params.anomaly.date}_${params.anomaly.value}`;
    keyParts.push(anomalyId);
  }
  
  return CACHE_PREFIX + keyParts.join('_');
};

// Get cached result
export const getCachedResult = (functionName, params) => {
  try {
    const cacheKey = generateCacheKey(functionName, params);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Check if cache was created before current session (page refresh invalidates cache)
    if (SESSION_START_TIME && timestamp < SESSION_START_TIME) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Check if cache is expired
    const age = Date.now() - timestamp;
    if (age > MAX_CACHE_AGE) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch (error) {
    return null;
  }
};

// Set cached result
export const setCachedResult = (functionName, params, data) => {
  let cacheKey;
  try {
    cacheKey = generateCacheKey(functionName, params);
    const cacheEntry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch (error) {
    // If storage is full, try to clear old entries
    if (cacheKey) {
      try {
        clearOldCacheEntries();
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (e) {
      }
    }
  }
};

// Clear old cache entries
const clearOldCacheEntries = () => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleared = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (now - timestamp > MAX_CACHE_AGE) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (e) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
          cleared++;
        }
      }
    });
    
    if (cleared > 0) {
    }
  } catch (error) {
  }
};

// Clear all AI cache
export const clearAICache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
  }
};

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map();

// Wrapper function to cache AI results with request deduplication
export const withCache = async (functionName, params, aiFunction) => {
  // Check cache first
  const cached = getCachedResult(functionName, params);
  if (cached !== null) {
    return cached;
  }
  
  // Generate cache key for request tracking
  const requestKey = generateCacheKey(functionName, params);
  
  // Check if there's already an ongoing request for this key
  if (ongoingRequests.has(requestKey)) {
    // Wait for the existing request to complete
    return await ongoingRequests.get(requestKey);
  }
  
  // Create a new request promise
  const requestPromise = (async () => {
    try {
      // Generate new result
      const result = await aiFunction();
      
      // Cache the result
      if (result !== null && result !== undefined) {
        setCachedResult(functionName, params, result);
      }
      
      return result;
    } finally {
      // Remove from ongoing requests when done
      ongoingRequests.delete(requestKey);
    }
  })();
  
  // Store the promise so other calls can wait for it
  ongoingRequests.set(requestKey, requestPromise);
  
  return await requestPromise;
};

