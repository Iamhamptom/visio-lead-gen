'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { Composer } from './components/Composer';
import { LeadsGallery } from './components/LeadsGallery';
import { ArtistPortal } from './components/ArtistPortal';
import { Onboarding } from './components/Onboarding';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { SettingsPage } from './components/SettingsPage';
import { Billing } from './components/Billing';
import ReasonPage from './reason/page';
import ReachPage from './reach/page';
import { Toast } from './components/Toast';
import { Message, Role, Campaign, ViewMode, Lead, Session, ArtistProfile, Subscription, SubscriptionTier } from './types';
import { AITier } from './components/Composer';
import { Menu } from 'lucide-react';
import { BackgroundBeams } from './components/ui/background-beams';
import { CommandMenu, COMMAND_ACTIONS, ACTION_PROMPTS } from './components/ui/command-menu';

// Default Campaigns (Folders)
const DEFAULT_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Tech Launch Q3', client: 'Arsa Tech', status: 'active' },
  { id: '2', name: 'Fashion Week', client: 'Vogue', status: 'active' },
  { id: '3', name: 'Crisis Mgmt', client: 'Tesla', status: 'completed' },
];

const createInitialSession = (): Session => ({
  id: Date.now().toString(),
  title: 'New Research',
  folderId: null, // Starts in Inbox
  lastUpdated: Date.now(),
  messages: [{
    id: 'init',
    role: Role.AGENT,
    content: `Hello! I am Visio, your dedicated Research Concierge.\n\nI can help you build media lists, find influencer contacts, or draft pitch strategies for the **Music & Entertainment** industry.`,
    timestamp: Date.now()
  }]
});

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State: Views and Sessions
  const [currentView, setCurrentView] = useState<ViewMode>('landing'); // Default safe state

  // Initialize sessions list
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [subscription, setSubscription] = useState<Subscription>({
    tier: 'artist',
    status: 'active',
    currentPeriodEnd: Date.now() + 1000 * 60 * 60 * 24 * 30, // +30 days
    interval: 'month'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<{ setInput: (text: string) => void }>(null);

  // Helper to update view and URL
  const navigateTo = (view: ViewMode) => {
    setCurrentView(view);
    const path = view === 'dashboard' ? '/' : `/${view}`;
    // Only push if different (to avoid duplicate history entries)
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  // Handle Initial Load & PopState
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const hasCompletedOnboarding = localStorage.getItem('visio_onboarding_complete');
      const hasProfile = localStorage.getItem('visio_artist_profile');
      const isLoggedIn = localStorage.getItem('visio_auth_token');

      // 1. Map URL to View
      let targetView: ViewMode = 'landing';
      if (path === '/' || path === '/dashboard') targetView = 'dashboard';
      else if (path === '/auth' || path === '/login' || path === '/signin') targetView = 'auth';
      else if (path === '/onboarding') targetView = 'onboarding';
      else if (path === '/artist-portal') targetView = 'artist-portal';
      else if (path === '/billing') targetView = 'billing';
      else if (path === '/landing') targetView = 'landing';

      // 2. Auth Guards
      if (!isLoggedIn) {
        // Allow landing and auth, otherwise force landing
        if (targetView !== 'auth' && targetView !== 'landing') {
          navigateTo('landing');
          return;
        }
        setCurrentView(targetView);
      } else {
        // Logged In
        if (!hasCompletedOnboarding && !hasProfile) {
          // Force onboarding if not done
          if (targetView !== 'onboarding') {
            navigateTo('onboarding');
            return;
          }
          setCurrentView('onboarding');
        } else {
          // Fully setup
          if (targetView === 'landing' || targetView === 'auth') {
            navigateTo('dashboard');
            return;
          }
          setCurrentView(targetView);
        }
      }
    };

    // Run on mount
    handleUrlChange();

    // Listen for back/forward
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const handleGetStarted = () => {
    setAuthMode('signup');
    navigateTo('auth');
  };

  const handleLogin = () => {
    setAuthMode('signin');
    navigateTo('auth');
  };

  const handleAuthComplete = () => {
    localStorage.setItem('visio_auth_token', 'mock_token_123');
    // Check if they need onboarding
    const hasCompletedOnboarding = localStorage.getItem('visio_onboarding_complete');
    if (!hasCompletedOnboarding) {
      navigateTo('onboarding');
    } else {
      navigateTo('dashboard');
    }
  };


  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);


  useEffect(() => {
    const storedProfile = localStorage.getItem('visio_artist_profile');
    if (storedProfile) {
      setArtistProfile(JSON.parse(storedProfile));
    }
  }, []);


  const handleOnboardingComplete = (profile: ArtistProfile) => {
    localStorage.setItem('visio_artist_profile', JSON.stringify(profile));
    localStorage.setItem('visio_onboarding_complete', 'true');
    setArtistProfile(profile);
    setShowOnboarding(false);
    setToastMessage(`Welcome, ${profile.name}! Your profile is ready.`);
    navigateTo('dashboard');
  };



  const handleOnboardingSkip = () => {
    localStorage.setItem('visio_onboarding_complete', 'true');
    setShowOnboarding(false);
    navigateTo('dashboard');
  };

  // Load Persistence
  useEffect(() => {
    const savedSessions = localStorage.getItem('visio_sessions_v2');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          handleNewChat();
        }
      } catch (e) {
        handleNewChat();
      }
    } else {
      // First time load
      handleNewChat();
    }
  }, []);

  // Save Persistence
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('visio_sessions_v2', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll on new message
  useEffect(() => {
    if (currentView === 'dashboard') {
      scrollToBottom();
    }
  }, [sessions, activeSessionId, currentView]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Listen for command menu events
  useEffect(() => {
    const handleCreateCampaign = () => {
      navigateTo('dashboard');
      setPendingPrompt(ACTION_PROMPTS[COMMAND_ACTIONS.CREATE_CAMPAIGN]);
      setToastMessage('✨ Campaign mode activated');
    };

    const handleFindInfluencers = () => {
      navigateTo('dashboard');
      setPendingPrompt(ACTION_PROMPTS[COMMAND_ACTIONS.FIND_INFLUENCERS]);
      setToastMessage('🔍 Finding influencers...');
    };

    const handleDraftPitch = () => {
      navigateTo('dashboard');
      setPendingPrompt(ACTION_PROMPTS[COMMAND_ACTIONS.DRAFT_PITCH]);
      setToastMessage('📝 Draft mode activated');
    };

    const handleNavigateArtistPortal = () => {
      navigateTo('artist-portal');
    };

    const handleNavigateInbox = () => {
      navigateTo('dashboard');
    };

    const handleDevelopCampaign = () => {
      navigateTo('dashboard');
      setPendingPrompt(ACTION_PROMPTS[COMMAND_ACTIONS.CREATE_CAMPAIGN]);
      setToastMessage('✨ Campaign development started');
    };

    window.addEventListener(COMMAND_ACTIONS.CREATE_CAMPAIGN, handleCreateCampaign);
    window.addEventListener(COMMAND_ACTIONS.FIND_INFLUENCERS, handleFindInfluencers);
    window.addEventListener(COMMAND_ACTIONS.DRAFT_PITCH, handleDraftPitch);
    window.addEventListener(COMMAND_ACTIONS.NAVIGATE_ARTIST_PORTAL, handleNavigateArtistPortal);
    window.addEventListener(COMMAND_ACTIONS.NAVIGATE_INBOX, handleNavigateInbox);
    window.addEventListener('visio:develop-campaign', handleDevelopCampaign);

    return () => {
      window.removeEventListener(COMMAND_ACTIONS.CREATE_CAMPAIGN, handleCreateCampaign);
      window.removeEventListener(COMMAND_ACTIONS.FIND_INFLUENCERS, handleFindInfluencers);
      window.removeEventListener(COMMAND_ACTIONS.DRAFT_PITCH, handleDraftPitch);
      window.removeEventListener(COMMAND_ACTIONS.NAVIGATE_ARTIST_PORTAL, handleNavigateArtistPortal);
      window.removeEventListener(COMMAND_ACTIONS.NAVIGATE_INBOX, handleNavigateInbox);
      window.removeEventListener('visio:develop-campaign', handleDevelopCampaign);
    };
  }, []);

  // --- Handlers ---

  const handleNewChat = () => {
    const newSession = createInitialSession();
    setSessions(prev => [newSession, ...prev]); // Add to top
    setActiveSessionId(newSession.id);
    navigateTo('dashboard');
    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    navigateTo('dashboard');
    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    if (confirm("Are you sure you want to delete this research?")) {
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);

      if (activeSessionId === id) {
        if (newSessions.length > 0) {
          setActiveSessionId(newSessions[0].id);
        } else {
          handleNewChat();
        }
      }
      setToastMessage("Research deleted");
    }
  };

  const handleMoveSession = (sessionId: string, folderId: string | null) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, folderId };
      }
      return s;
    }));

    const folderName = folderId
      ? DEFAULT_CAMPAIGNS.find(c => c.id === folderId)?.name
      : "Inbox";
    setToastMessage(`Moved to ${folderName}`);
  };

  const handleShareSession = (sessionId: string) => {
    // Mock share
    setToastMessage("Share link copied to clipboard");
  };

  const handleSendMessage = async (text: string, tier: AITier = 'instant') => {
    const activeSessionIndex = sessions.findIndex(s => s.id === activeSessionId);
    if (activeSessionIndex === -1) return;

    const currentSession = sessions[activeSessionIndex];

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: text,
      timestamp: Date.now()
    };

    // Auto-update Title if it's the first real query and still default
    let newTitle = currentSession.title;
    if (currentSession.messages.length <= 1 && currentSession.title === 'New Research') {
      newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    }

    const newHistory = [...currentSession.messages, userMsg];

    // Update State (Optimistic)
    const updatedSession = {
      ...currentSession,
      title: newTitle,
      messages: newHistory,
      lastUpdated: Date.now()
    };

    const updatedSessions = [...sessions];
    updatedSessions[activeSessionIndex] = updatedSession;
    setSessions(updatedSessions);
    setIsLoading(true);

    // 2. Add Thinking (with tier for reasoning animation)
    const tempId = (Date.now() + 1).toString();
    const sessionWithThinking = {
      ...updatedSession,
      messages: [...newHistory, {
        id: tempId,
        role: Role.AGENT,
        content: '',
        timestamp: Date.now(),
        isThinking: true,
        tier: tier // Pass tier for reasoning display
      }]
    };
    updatedSessions[activeSessionIndex] = sessionWithThinking;
    setSessions([...updatedSessions]);

    // 3. Call Backend
    try {
      // Build minimal history for backend (role/content only)
      const historyForApi = newHistory.map(m => ({
        role: m.role === Role.AGENT ? 'agent' : 'user',
        content: m.content
      }));

      // Get Artist Context
      const storedProfile = localStorage.getItem('visio_artist_profile');
      const artistContext = storedProfile ? JSON.parse(storedProfile) : null;

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: historyForApi,
          artistContext,
          tier
        })
      });

      const data = await res.json();

      // 4. Update Final
      const finalMessages = sessionWithThinking.messages.map(msg => {
        if (msg.id === tempId) {
          // If the backend returns leads, try to format them into the message content or separate field
          // Our ChatMessage component expects leads in `msg.leads` or embedded JSON block.
          // The backend API returns { message: string, leads: Lead[] }

          // We'll attach leads directly to the message object
          return {
            ...msg,
            content: data.message || "Done.",
            leads: data.leads || [], // Attach leads here
            isThinking: false
          };
        }
        return msg;
      });

      const finalSession = { ...sessionWithThinking, messages: finalMessages };
      updatedSessions[activeSessionIndex] = finalSession;
      setSessions([...updatedSessions]);

    } catch (error: any) {
      console.error("Agent Error:", error);
      const finalMessages = sessionWithThinking.messages.map(msg => {
        if (msg.id === tempId) {
          return { ...msg, content: `Error: ${error.message}`, isThinking: false };
        }
        return msg;
      });
      const finalSession = { ...sessionWithThinking, messages: finalMessages };
      updatedSessions[activeSessionIndex] = finalSession;
      setSessions([...updatedSessions]);
      setToastMessage("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLead = (lead: Lead) => {
    setToastMessage(`Saved ${lead.name} to Database`);
    // Ideally call backend to save
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    setSubscription(prev => ({
      ...prev,
      tier: tier,
      status: 'active',
      currentPeriodEnd: Date.now() + 1000 * 60 * 60 * 24 * 30 // Extend for 30 days
    }));
    setToastMessage(`Upgraded to ${tier} plan!`);
    setToastMessage(`Upgraded to ${tier} plan!`);
    navigateTo('artist-portal'); // Or back to dashboard
  };

  // --- Derived Data ---

  const allLeads = useMemo(() => {
    const leads: Lead[] = [];
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        // Check for direct leads array (from backend)
        if (msg.leads && msg.leads.length > 0) {
          leads.push(...msg.leads);
        }

        // Legacy/Skin parsing for embedded JSON blocks
        const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = msg.content.match(jsonBlockRegex);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            // Only add if not already added via leads array
            if (!msg.leads || msg.leads.length === 0) {
              leads.push(...parsed);
            }
          } catch (e) { }
        }
      });
    });
    const unique = new Map();
    leads.forEach(l => unique.set(l.id, l));
    return Array.from(unique.values());
  }, [sessions]);

  const activeMessages = sessions.find(s => s.id === activeSessionId)?.messages || [];

  return (
    <div className="flex h-screen w-full bg-visio-bg overflow-hidden text-white font-outfit relative">

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Dynamic Background with Premium Beams */}
      <BackgroundBeams className="fixed inset-0 z-0 pointer-events-none" />

      {/* Conditional Layout based on View */}
      {currentView === 'landing' ? (
        <div className="flex-1 w-full h-full overflow-y-auto">
          <LandingPage
            onGetStarted={handleGetStarted}
            onLogin={handleLogin}
          />
        </div>
      ) : currentView === 'auth' ? (
        <div className="flex-1 w-full h-full overflow-y-auto">
          <AuthPage key={authMode} onComplete={handleAuthComplete} initialMode={authMode} />
        </div>
      ) : currentView === 'onboarding' ? (
        <div className="flex-1 w-full h-full overflow-y-auto">
          <Onboarding
            onComplete={(profile) => {
              handleOnboardingComplete(profile);
              // NavigateTo is handled in handler
            }}
            onSkip={() => {
              handleOnboardingSkip();
              // NavigateTo is handled in handler
            }}
          />
        </div>
      ) : (
        <>
          <Sidebar
            isOpen={isSidebarOpen}
            activeView={currentView}
            activeSessionId={activeSessionId}
            campaigns={DEFAULT_CAMPAIGNS}
            sessions={sessions}
            onNavigate={navigateTo}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onMoveSession={handleMoveSession}
            onDeleteSession={handleDeleteSession}
            onShareSession={handleShareSession}
            subscription={subscription}
          />

          {/* Main Content */}
          <main className="flex-1 flex flex-col md:ml-64 relative z-10 h-full bg-visio-bg/50">

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-bold text-xs">V</div>
                <span className="font-bold">Visio AI</span>
              </div>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white">
                <Menu />
              </button>
            </header>

            {/* Desktop Header / Status Bar - Fixes "floating" feel */}
            <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-white/80">
                  {currentView === 'dashboard' ? (sessions.find(s => s.id === activeSessionId)?.title || 'New Research') :
                    currentView === 'leads' ? 'Lead Database' : 'Artist Portal'}
                </h2>
                {isLoading && <span className="text-xs text-visio-accent animate-pulse">Processing...</span>}
              </div>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span>v1.2.0</span>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
              </div>
            </header>

            {/* View Switcher */}
            {currentView === 'dashboard' ? (
              <>
                {/* Chat Area - Adjusted padding for fixed headers */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 scroll-smooth">
                  <div className="max-w-4xl mx-auto flex flex-col pt-2">
                    {activeMessages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} onSaveLead={handleSaveLead} />
                    ))}
                    <div ref={messagesEndRef} className="h-4" />
                  </div>
                </div>

                {/* Footer / Composer */}
                <div className="flex-shrink-0 bg-gradient-to-t from-visio-bg via-visio-bg to-transparent pt-10 pb-2">
                  <Composer
                    onSend={handleSendMessage}
                    isLoading={isLoading}
                    pendingPrompt={pendingPrompt}
                    onPromptUsed={() => setPendingPrompt(null)}
                  />
                </div>
              </>
            ) : currentView === 'leads' ? (
              <LeadsGallery
                leads={allLeads}
                onSaveLead={handleSaveLead}
                onBack={() => navigateTo('dashboard')}
              />
            ) : currentView === 'artist-portal' ? (
              <ArtistPortal
                subscription={subscription}
                onUpgrade={() => navigateTo('billing')}
                onBack={() => navigateTo('dashboard')}
              />
            ) : currentView === 'billing' ? (
              <Billing
                currentSubscription={subscription}
                onUpgrade={handleUpgrade}
                onBack={() => navigateTo('dashboard')}
              />
            ) : currentView === 'reason' ? (
              <ReasonPage onBack={() => navigateTo('dashboard')} />
            ) : currentView === 'reach' ? (
              <ReachPage onBack={() => navigateTo('dashboard')} />
            ) : currentView === 'settings' ? (
              <SettingsPage
                subscription={subscription}
                onBack={() => navigateTo('dashboard')}
                onNavigateHome={() => navigateTo('landing')}
                onLogout={handleLogout}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30">
                <div className="text-center">
                  <p className="text-lg">Automations Module</p>
                  <p className="text-sm">Coming Soon</p>
                </div>
              </div>
            )}
          </main>

          {/* Overlay for mobile sidebar */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </>
      )}
    </div >
  );
}
