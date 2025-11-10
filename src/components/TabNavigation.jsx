// Tab-Based Navigation Component
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Clock, Sparkles, Activity, Info,
  Bell, Settings, MessageCircle, Search, X
} from 'lucide-react';

const theme = {
  background: {
    primary: '#ffffff',
    secondary: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 100%)',
    card: '#ffffff',
  },
  border: {
    primary: '#bae6fd',
  },
  text: {
    primary: '#0c4a6e',
    secondary: '#334155',
    tertiary: '#64748b',
  },
  accent: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
  }
};

const TabNavigation = ({ onOpenAIChat, newInsightsCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/timeline', label: 'Timeline', icon: Clock },
    { path: '/insights', label: 'Insights', icon: Sparkles },
    { path: '/metrics', label: 'Metrics', icon: Activity },
    { path: '/about', label: 'About', icon: Info },
  ];

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return '/dashboard';
    if (path.startsWith('/timeline')) return '/timeline';
    if (path.startsWith('/insights')) return '/insights';
    if (path.startsWith('/metrics')) return '/metrics';
    if (path.startsWith('/about')) return '/about';
    return '/dashboard'; // Default
  };

  const currentTab = getCurrentTab();

  const handleTabClick = (path) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white" style={{ borderColor: theme.border.primary }}>
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.path;
          const isInsights = tab.path === '/insights';
          
          return (
            <button
              key={tab.path}
              onClick={() => handleTabClick(tab.path)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all relative"
              style={{
                backgroundColor: isActive ? theme.accent.primary : 'transparent',
                color: isActive ? 'white' : theme.text.secondary
              }}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isInsights && newInsightsCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: '#f43f5e', color: 'white' }}
                  >
                    {newInsightsCount > 9 ? '9+' : newInsightsCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Header Component for all pages
export const PageHeader = ({ title, onOpenSettings, onOpenNotifications, notificationCount = 0, rightAction, allHealthData, onSearch }) => {
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !allHealthData || isSearching) return;

    setIsSearching(true);
    setSearchResults(null);

    try {
      // Import answerHealthQuestion dynamically
      const { answerHealthQuestion } = await import('../utils/aiInsights');
      const response = await answerHealthQuestion(searchQuery.trim(), allHealthData);
      setSearchResults(response);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        answer: 'Sorry, I encountered an error processing your question. Please try again.',
        sources: { correlations: [], anomalies: [] }
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <>
      <header 
        className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-sm"
        style={{ borderColor: theme.border.primary }}
      >
        <div className="flex items-center gap-4 px-6 py-3">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img 
              src="/icon.svg" 
              alt="HealthyLyst Logo" 
              className="w-9 h-9"
            />
            <h1 className="text-xl font-bold" style={{ color: theme.text.primary }}>
              {title}
            </h1>
          </div>
          
          {/* Middle: Full-width Search Bar */}
          <form 
            onSubmit={handleSearch} 
            className="flex items-center gap-2 flex-1 mx-4"
            onClick={(e) => {
              e.preventDefault();
              setShowSearch(true);
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
          >
            <Search className="w-5 h-5 flex-shrink-0" style={{ color: theme.text.secondary }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch(true);
              }}
              placeholder="Ask AI anything about your health data... (e.g., Why am I so tired today?)"
              className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm cursor-text"
              style={{ 
                borderColor: theme.border.primary,
                color: theme.text.primary,
                focusRingColor: theme.accent.primary
              }}
              disabled={isSearching}
              readOnly
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-all flex-shrink-0"
                style={{ color: theme.text.secondary }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {rightAction}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: theme.text.secondary }}
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span 
                    className="absolute top-0 right-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#f43f5e' }}
                  />
                )}
              </button>
            )}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: theme.text.secondary }}
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Search Results Panel - Modal Overlay */}
      {showSearch && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-20"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSearching) {
              setShowSearch(false);
              setSearchQuery('');
              setSearchResults(null);
            }
          }}
        >
          <div 
            className="bg-white shadow-2xl rounded-2xl border w-full max-w-3xl max-h-[calc(100vh-5rem)] flex flex-col mx-4"
            style={{ borderColor: theme.border.primary }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Search Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border.primary }}>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" style={{ color: theme.text.secondary }} />
              <h2 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                Ask AI About Your Health
              </h2>
            </div>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.text.secondary }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input in Modal */}
          <div className="p-4 border-b" style={{ borderColor: theme.border.primary }}>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask AI anything about your health data... (e.g., Why am I so tired today?)"
                className="flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm"
                style={{ 
                  borderColor: theme.border.primary,
                  color: theme.text.primary,
                  focusRingColor: theme.accent.primary
                }}
                disabled={isSearching}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="p-2 rounded hover:bg-gray-100 transition-all"
                  style={{ color: theme.text.secondary }}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto p-6">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent.primary }}></div>
                    <p className="text-sm" style={{ color: theme.text.secondary }}>Analyzing your health data...</p>
                  </div>
                </div>
              ) : searchResults ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
                    <p className="text-sm leading-relaxed" style={{ color: theme.text.primary }}>
                      {searchResults.answer}
                    </p>
                  </div>
                  
                  {(searchResults.sources?.correlations?.length > 0 || searchResults.sources?.anomalies?.length > 0) && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border.primary }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: theme.text.secondary }}>Based on:</p>
                      {searchResults.sources.correlations?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs" style={{ color: theme.text.tertiary }}>Patterns: {searchResults.sources.correlations.map(c => `${c.metric1Label} → ${c.metric2Label}`).join(', ')}</p>
                        </div>
                      )}
                      {searchResults.sources.anomalies?.length > 0 && (
                        <div>
                          <p className="text-xs" style={{ color: theme.text.tertiary }}>Anomalies: {searchResults.sources.anomalies.map(a => a.metric).join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm mb-4" style={{ color: theme.text.secondary }}>
                    Ask me anything about your health data
                  </p>
                  <div className="space-y-2 text-left max-w-md mx-auto">
                    <button
                      onClick={async () => {
                        const query = 'Why am I so tired today?';
                        setSearchQuery(query);
                        setIsSearching(true);
                        setSearchResults(null);
                        try {
                          const { answerHealthQuestion } = await import('../utils/aiInsights');
                          const response = await answerHealthQuestion(query, allHealthData);
                          setSearchResults(response);
                        } catch (error) {
                          console.error('Search error:', error);
                          setSearchResults({
                            answer: 'Sorry, I encountered an error processing your question. Please try again.',
                            sources: { correlations: [], anomalies: [] }
                          });
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all text-sm"
                      style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                    >
                      Why am I so tired today?
                    </button>
                    <button
                      onClick={async () => {
                        const query = "What's affecting my sleep quality?";
                        setSearchQuery(query);
                        setIsSearching(true);
                        setSearchResults(null);
                        try {
                          const { answerHealthQuestion } = await import('../utils/aiInsights');
                          const response = await answerHealthQuestion(query, allHealthData);
                          setSearchResults(response);
                        } catch (error) {
                          console.error('Search error:', error);
                          setSearchResults({
                            answer: 'Sorry, I encountered an error processing your question. Please try again.',
                            sources: { correlations: [], anomalies: [] }
                          });
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all text-sm"
                      style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                    >
                      What's affecting my sleep quality?
                    </button>
                    <button
                      onClick={async () => {
                        const query = 'How does my activity level impact my mood?';
                        setSearchQuery(query);
                        setIsSearching(true);
                        setSearchResults(null);
                        try {
                          const { answerHealthQuestion } = await import('../utils/aiInsights');
                          const response = await answerHealthQuestion(query, allHealthData);
                          setSearchResults(response);
                        } catch (error) {
                          console.error('Search error:', error);
                          setSearchResults({
                            answer: 'Sorry, I encountered an error processing your question. Please try again.',
                            sources: { correlations: [], anomalies: [] }
                          });
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all text-sm"
                      style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                    >
                      How does my activity level impact my mood?
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Search Footer */}
          {searchResults && (
            <div className="p-4 border-t flex justify-end" style={{ borderColor: theme.border.primary }}>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                  searchInputRef.current?.focus();
                }}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all text-sm"
                style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
              >
                Ask Another Question
              </button>
            </div>
          )}
        </div>
        </div>
      )}
    </>
  );
};

export default TabNavigation;

