'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { Composer } from './components/Composer';
import { LeadsGallery } from './components/LeadsGallery';
import { PortalGate } from './components/PortalGate';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { PendingPage } from './components/PendingPage';
import { SettingsPage } from './components/SettingsPage';
import { Billing } from './components/Billing';
import { DashboardOverview } from './components/DashboardOverview';
import ReasonPage from './reason/page';
import ReachPage from './reach/page';
import { Toast } from './components/Toast';
import { Message, Role, Campaign, ViewMode, Lead, Session, ArtistProfile, Subscription, SubscriptionTier, AgentMode } from './types';
import { AITier } from './components/Composer';
import { Menu, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { BackgroundBeams } from './components/ui/background-beams';
import { CommandMenu, COMMAND_ACTIONS, ACTION_PROMPTS } from './components/ui/command-menu';
import { useAuth } from '@/lib/auth-context';
import {
  saveArtistProfile,
  loadArtistProfile,
  saveOnboardingComplete,
  checkOnboardingComplete,
  saveSessions,
  loadSessions,
  deleteSession,
  loadSubscription,
  updateSubscription
} from '@/lib/data-service';

// Default Campaigns (Folders) - Users create their own
const DEFAULT_CAMPAIGNS: Campaign[] = [];

const createInitialSession = (): Session => ({
  id: crypto.randomUUID(),
  title: 'New Research',
  folderId: null, // Starts in Inbox
  lastUpdated: Date.now(),
  messages: [{
    // Must be a UUID because we persist messages to Supabase (messages.id is UUID).
    id: crypto.randomUUID(),
    role: Role.AGENT,
    content: `Hello! I am Visio, your dedicated Research Concierge.\n\nI can help you build media lists, find influencer contacts, or draft pitch strategies for the **Music & Entertainment** industry.`,
    timestamp: Date.now()
  }]
});

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const isApproved = user?.app_metadata?.approved === true;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userId = user?.id;

  // State: Views and Sessions
  const [currentView, setCurrentView] = useState<ViewMode>('landing'); // Default safe state

  // Initialize sessions list
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [subscription, setSubscription] = useState<Subscription>({
    tier: 'artist',
    status: 'active',
    currentPeriodEnd: 0, // Will be set client-side
    interval: 'month'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<{ setInput: (text: string) => void }>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isChatAtBottomRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);

  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [isChatScrollable, setIsChatScrollable] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Helper to update view and URL
  const navigateTo = (view: ViewMode) => {
    setCurrentView(view);
    // Keep "Overview" at `/` and the chat interface at `/dashboard` so refresh/deeplink works.
    const path = view === 'overview' ? '/' : `/${view}`;
    // Only push if different (to avoid duplicate history entries)
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  const localSessionsKey = useCallback(() => `visio:sessions:${userId || 'guest'}`, [userId]);
  const localLastSessionKey = useCallback(() => `visio:lastSessionId:${userId || 'guest'}`, [userId]);

  const loadLocalSessions = useCallback((): Session[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(localSessionsKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Session[]) : [];
    } catch {
      return [];
    }
  }, [localSessionsKey]);

  const saveLocalSessions = useCallback((nextSessions: Session[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(localSessionsKey(), JSON.stringify(nextSessions));
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [localSessionsKey]);

  const attemptRemoteSave = useCallback(async (nextSessions: Session[]) => {
    if (!user) return true;
    try {
      const ok = await saveSessions(nextSessions);
      if (!ok) {
        setPersistenceWarning('Supabase sync failed. Using local storage only.');
        return false;
      }
      setPersistenceWarning(null);
      return true;
    } catch (error) {
      console.error('Supabase sync failed:', error);
      setPersistenceWarning('Supabase sync failed. Using local storage only.');
      return false;
    }
  }, [user]);

  const mergeSessions = useCallback((localSessions: Session[], remoteSessions: Session[]) => {
    const byId = new Map<string, Session>();
    const all = [...localSessions, ...remoteSessions];
    for (const session of all) {
      const existing = byId.get(session.id);
      if (!existing) {
        byId.set(session.id, session);
        continue;
      }
      const existingCount = existing.messages?.length || 0;
      const nextCount = session.messages?.length || 0;
      if (nextCount > existingCount) {
        byId.set(session.id, session);
      } else if (session.lastUpdated > existing.lastUpdated) {
        byId.set(session.id, session);
      }
    }
    return Array.from(byId.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);
  }, []);

  // Handle Initial Load & PopState  
  // Handle Initial Load & Auth State check
  useEffect(() => {
    // Don't run until auth is loaded
    if (authLoading) return;

    const checkUserStatus = async () => {
      const path = window.location.pathname;
      const isLoggedIn = !!user;

      let hasCompletedOnboarding = false;
      let hasProfile = false;

      if (isLoggedIn) {
        // Fetch real status from Supabase
        const [onboardingStatus, profile] = await Promise.all([
          checkOnboardingComplete(),
          loadArtistProfile()
        ]);
        hasCompletedOnboarding = onboardingStatus;
        hasProfile = !!profile;

        if (profile) {
          setArtistProfile(profile);
        } else {
          setArtistProfile(null);
        }
      }

      // 1. Map URL to View
      let targetView: ViewMode = 'landing';
      if (path === '/' || path === '/overview') targetView = 'overview';
      else if (path === '/dashboard') targetView = 'dashboard';
      else if (path === '/auth' || path === '/login' || path === '/signin') targetView = 'auth';
      else if (path === '/onboarding') targetView = 'onboarding';
      else if (path === '/artist-portal') targetView = 'settings'; // Portal deferred; route to settings
      else if (path === '/billing') targetView = 'billing';
      else if (path === '/settings') targetView = 'settings';
      else if (path === '/leads') targetView = 'leads';
      else if (path === '/reason') targetView = 'reason';
      else if (path === '/reach') targetView = 'reach';
      else if (path === '/pending') targetView = 'pending';
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
        // Logged In - Feature Gating (Soft Gate)
        const isApproved = user?.app_metadata?.approved === true;

        /* REMOVED HARD REDIRECT
        if (!isApproved) {
            if (targetView !== 'pending') {
                setCurrentView('pending');
                return;
            }
            setCurrentView('pending');
            return;
        }
        */

        // Check onboarding/profile
        if (!hasCompletedOnboarding && !hasProfile) {
          if (targetView !== 'auth' && targetView !== 'landing') {
            // We'll handle the gate inside dashboard
          }
        } else {
          if (targetView === 'landing' || targetView === 'auth') {
            navigateTo('overview');
            return;
          }
          setCurrentView(targetView);
        }
      }


    };

    checkUserStatus();

    // Listen for back/forward (simplified)
    window.addEventListener('popstate', checkUserStatus);
    return () => window.removeEventListener('popstate', checkUserStatus);
  }, [user, authLoading]);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const handleGetStarted = () => {
    setAuthMode('signup');
    navigateTo('auth');
  };

  const handleLogin = () => {
    setAuthMode('signin');
    navigateTo('auth');
  };

  const handleAuthComplete = async () => {
    // Check both profile AND onboarding completion status
    const [profile, hasCompletedOnboarding] = await Promise.all([
      loadArtistProfile(),
      checkOnboardingComplete()
    ]);

    if (profile) {
      setArtistProfile(profile);
    }

    // Only check if profile exists
    if (profile) {
      setArtistProfile(profile);
      navigateTo('overview');
    } else {
      // No profile found - let them go to overview but they will be gated
      console.log("No profile found, will show gate");
      navigateTo('overview');
    }
  };


  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);


  // Artist profile loaded in main effect above

  // If auth is lost (sign out or expired session), clear user-scoped state so we don't leak data across accounts.
  useEffect(() => {
    if (authLoading) return;
    if (user) return;

    setSessions([]);
    setActiveSessionId('');
    setSubscription({
      tier: 'artist',
      status: 'active',
      currentPeriodEnd: 0,
      interval: 'month'
    });
    setArtistProfile(null);
    setIsSidebarOpen(false);
  }, [user, authLoading]);



  const handleLogout = async () => {
    await signOut(); // Supabase sign out
    setArtistProfile(null);
    setSessions([]);
    setActiveSessionId('');
    navigateTo('landing');
  };

  // Set subscription date client-side to avoid hydration mismatch
  // Load Subscription from Supabase
  useEffect(() => {
    const initSubscription = async () => {
      // 1. Try loading from DB
      const savedSub = await loadSubscription();
      if (savedSub) {
        setSubscription(savedSub);
      } else {
        // 2. Default if nothing found (Artist Tier)
        setSubscription(prev => ({
          ...prev,
          currentPeriodEnd: Date.now() + 1000 * 60 * 60 * 24 * 30
        }));
      }
    };

    if (user && !authLoading) {
      initSubscription();
    }
  }, [user, authLoading]);

  // Listen for profile updates from Settings/ArtistPortal saves
  useEffect(() => {
    const handleProfileUpdate = async () => {
      const updatedProfile = await loadArtistProfile();
      if (updatedProfile) {
        setArtistProfile(updatedProfile);
      }
    };

    window.addEventListener('artistProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('artistProfileUpdated', handleProfileUpdate);
  }, []);

  // Load Persistence
  useEffect(() => {
    const fetchSessions = async () => {
      if (authLoading) return;

      const cached = loadLocalSessions();

      if (!user) {
        if (cached.length > 0) {
          setSessions(cached);
          const lastSessionId = typeof window !== 'undefined'
            ? window.localStorage.getItem(localLastSessionKey())
            : null;
          const preferred = lastSessionId && cached.some(s => s.id === lastSessionId)
            ? lastSessionId
            : cached[0].id;
          setActiveSessionId(preferred);
          return;
        }
        handleNewChat();
        return;
      }

      const loadedSessions = await loadSessions();
      const merged = mergeSessions(cached, loadedSessions || []);
      if (merged.length > 0) {
        setSessions(merged);
        saveLocalSessions(merged);
        const lastSessionId = typeof window !== 'undefined'
          ? window.localStorage.getItem(localLastSessionKey())
          : null;
        const preferred = lastSessionId && merged.some(s => s.id === lastSessionId)
          ? lastSessionId
          : merged[0].id;
        setActiveSessionId(preferred);
      } else {
        handleNewChat();
      }
    };

    // Only fetch if sessions are empty (initial load)
    if (sessions.length === 0) {
      fetchSessions();
    }
  }, [user, authLoading, loadLocalSessions, localLastSessionKey, mergeSessions, saveLocalSessions]);

  // Persist last active session per-user (or guest) so returning users land back where they left off.
  useEffect(() => {
    if (!activeSessionId) return;
    try {
      window.localStorage.setItem(localLastSessionKey(), activeSessionId);
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [activeSessionId, localLastSessionKey]);

  // Flush saves when the user backgrounds/leaves the app (common on mobile "home button").
  useEffect(() => {
    if (sessions.length === 0) return;

    const flush = () => {
      if (sessions.length === 0) return;
      saveLocalSessions(sessions);
      if (user) {
        void attemptRemoteSave(sessions);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, sessions, saveLocalSessions, attemptRemoteSave]);

  // Save Persistence
  useEffect(() => {
    // Debounce save or just save on change
    // Using a simple timeout to avoid too many writes
    if (sessions.length > 0) {
      const timer = setTimeout(() => {
        saveLocalSessions(sessions);
        if (user) {
          void attemptRemoteSave(sessions);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessions, user, saveLocalSessions, attemptRemoteSave]);

  const updateChatScrollState = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    const threshold = 80;
    const atTop = el.scrollTop <= threshold;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const atBottom = maxScroll - el.scrollTop <= threshold;
    const scrollable = maxScroll > 4;
    const progress = scrollable ? Math.min(1, Math.max(0, el.scrollTop / maxScroll)) : 1;

    isChatAtBottomRef.current = atBottom;
    setIsChatScrollable(scrollable);
    setScrollProgress(progress);
    setShowScrollToTop(scrollable && !atTop);
    setShowScrollToBottom(scrollable && !atBottom);
  }, []);

  const handleChatScroll = useCallback(() => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      updateChatScrollState();
    });
  }, [updateChatScrollState]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // Prefer scrolling to the sentinel so we don't fight layout/padding.
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 0);
  }, []);

  const scrollToTop = useCallback(() => {
    chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChatWheel = useCallback((event: React.WheelEvent) => {
    const el = chatScrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) return;
    // Force the scroll on the chat container even if the wheel event hits the wrapper.
    el.scrollTop += event.deltaY;
    event.preventDefault();
  }, []);

  // When switching sessions / entering the chat view, jump to the bottom.
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    scrollToBottom('auto');
    // Recompute after layout settles
    setTimeout(updateChatScrollState, 50);
  }, [activeSessionId, currentView, scrollToBottom, updateChatScrollState]);

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
    window.addEventListener(COMMAND_ACTIONS.NAVIGATE_INBOX, handleNavigateInbox);
    window.addEventListener('visio:develop-campaign', handleDevelopCampaign);

    return () => {
      window.removeEventListener(COMMAND_ACTIONS.CREATE_CAMPAIGN, handleCreateCampaign);
      window.removeEventListener(COMMAND_ACTIONS.FIND_INFLUENCERS, handleFindInfluencers);
      window.removeEventListener(COMMAND_ACTIONS.DRAFT_PITCH, handleDraftPitch);
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

  const handleDeleteSession = async (id: string) => {
    if (confirm("Are you sure you want to delete this research?")) {
      // Persist delete so it doesn't reappear on refresh.
      await deleteSession(id);

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

  const handleSendMessage = async (text: string, tier: AITier = 'instant', mode: AgentMode = 'chat') => {
    // --- Access Control / Mode Locking ---
    const userTier = subscription.tier;

    // Defines which tiers can access which AI modes
    // Artist (Free) -> Instant Only
    // Starter (R199) & Artiste (R570) -> Instant + Standard
    // Label+ -> All
    const RESTRICTIONS = {
      'artist': ['instant'],
      'starter': ['instant', 'standard'],
      'artiste': ['instant', 'standard'],
      'starter_label': ['instant', 'standard', 'business'],
      'label': ['instant', 'standard', 'business', 'enterprise'],
      'agency': ['instant', 'standard', 'business', 'enterprise'],
      'enterprise': ['instant', 'standard', 'business', 'enterprise']
    };

    const allowedTiers = RESTRICTIONS[userTier] || ['instant']; // Fallback to instant

    // Check 1: Is the requested AI Tier allowed?
    if (!allowedTiers.includes(tier)) {
      setToastMessage(`Upgrade to ${userTier === 'artist' ? 'Starter' : 'Label'} to use ${tier.toUpperCase()} mode.`);
      return; // BLOCK ACTION
    }

    // Check 2: Explicit Mode Check (e.g. Switching to Business Mode)
    // If user is trying to use 'business' or 'enterprise' logic but is on a lower plan
    if ((mode === 'research' || tier === 'business' || tier === 'enterprise') && !['starter_label', 'label', 'agency', 'enterprise'].includes(userTier)) {
      // Allow Research for Starter/Artiste but maybe limited? 
      // For now, strict block on Business/Enterprise TIER usage.
      // If generic 'research' mode is used with 'standard' tier, that's fine for Starter/Artiste.
    }

    // -------------------------------------

    const activeSessionIndex = sessions.findIndex(s => s.id === activeSessionId);
    if (activeSessionIndex === -1) return;

    const currentSession = sessions[activeSessionIndex];

    // 1. Add User Message
    const userMsg: Message = {
      id: crypto.randomUUID(),
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
    // Must be UUID because we persist messages to Supabase (messages.id is UUID).
    const tempId = crypto.randomUUID();
    const sessionWithThinking = {
      ...updatedSession,
      messages: [...newHistory, {
        id: tempId,
        role: Role.AGENT,
        content: '',
        timestamp: Date.now(),
        isThinking: true,
        tier: tier, // Pass tier for reasoning display
        mode: mode // Pass mode for UI text
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

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: historyForApi,
          artistContext: artistProfile, // Ignored by backend (source of truth is server fetch)
          tier,
          mode
        })
      });

      const data = await res.json();

      // Handle Portal/Failsafe server gates gracefully
      if (!res.ok) {
        const errorMsg = data?.message || 'Portal setup required.';
        const finalMessages = sessionWithThinking.messages.map(msg => {
          if (msg.id === tempId) {
            return { ...msg, content: errorMsg, isThinking: false };
          }
          return msg;
        });
        const finalSession = { ...sessionWithThinking, messages: finalMessages };
        updatedSessions[activeSessionIndex] = finalSession;
        setSessions([...updatedSessions]);
        setToastMessage(errorMsg);
        setIsLoading(false);
        return;
      }

      // 4. Update Final
      const finalMessages = sessionWithThinking.messages.map(msg => {
        if (msg.id === tempId) {
          return {
            ...msg,
            content: data.message || "Done.",
            leads: data.leads || [],
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

  const handleUpgrade = async (tier: SubscriptionTier) => {
    const newDetails = {
      tier: tier,
      status: 'active' as const,
      currentPeriodEnd: Date.now() + 1000 * 60 * 60 * 24 * 30
    };

    setSubscription(prev => ({
      ...prev,
      ...newDetails
    }));

    // Persist
    await updateSubscription(newDetails);

    setToastMessage(`Upgraded to ${tier} plan!`);
    navigateTo('settings'); // Direct users to profile/settings
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
  const lastActiveMessageId = activeMessages[activeMessages.length - 1]?.id;

  // On new messages: only auto-scroll if the user is already at the bottom.
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    if (isChatAtBottomRef.current) {
      scrollToBottom('smooth');
    }
    setTimeout(updateChatScrollState, 50);
  }, [lastActiveMessageId, currentView, scrollToBottom, updateChatScrollState]);

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className="flex h-screen w-full bg-visio-bg items-center justify-center text-white font-outfit">
        <BackgroundBeams className="fixed inset-0 z-0 pointer-events-none" />
        <div className="flex flex-col items-center gap-4 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-visio-teal" />
          <p className="text-white/50 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-visio-bg overflow-hidden text-white font-outfit relative">

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Persistence Debug Banner */}
      {persistenceWarning && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-red-500/10 border border-red-500/30 text-red-200 text-xs px-4 py-3 rounded-xl backdrop-blur-md shadow-lg">
          <div className="font-semibold mb-1">Sync Warning</div>
          <div className="text-red-100/80">{persistenceWarning}</div>
          <button
            onClick={() => setPersistenceWarning(null)}
            className="mt-2 text-[10px] text-red-200/70 hover:text-red-100 underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
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
      ) : currentView === 'pending' ? (
        <PendingPage />
      ) : (
        <>
          <Sidebar
            isOpen={isSidebarOpen}
            activeView={currentView}
            activeSessionId={activeSessionId}
            campaigns={DEFAULT_CAMPAIGNS}
            sessions={sessions}
            onNavigate={(view) => {
              navigateTo(view);
              setIsSidebarOpen(false); // Close sidebar on navigation (mobile)
            }}
            onSelectSession={(id) => {
              handleSelectSession(id);
              setIsSidebarOpen(false); // Close sidebar on selection (mobile)
            }}
            onNewChat={() => {
              handleNewChat();
              setIsSidebarOpen(false); // Close sidebar on new chat (mobile)
            }}
            onMoveSession={handleMoveSession}
            onDeleteSession={handleDeleteSession}
            onShareSession={handleShareSession}
            subscription={subscription}
            artistProfile={artistProfile}
            isRestricted={!isApproved}
          />

          {/* Mobile Sidebar Overlay Backdrop */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            />
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col md:ml-64 relative z-10 h-full min-h-0 bg-visio-bg/50">

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
            {currentView === 'overview' ? (
              <div className="flex-1 overflow-hidden">
                <DashboardOverview
                  artistProfile={artistProfile}
                  onNavigate={navigateTo}
                  onNewChat={handleNewChat}
                />
              </div>
            ) : currentView === 'dashboard' ? (
              <>
                <div className="flex-1 min-h-0 relative" onWheel={handleChatWheel}>
                  <div
                    ref={chatScrollRef}
                    onScroll={handleChatScroll}
                    className="absolute inset-0 overflow-y-auto overscroll-contain scroll-smooth touch-pan-y px-4 md:px-0 pb-32"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {!artistProfile ? (
                      <PortalGate
                        onRefresh={async () => {
                          setIsLoading(true);
                          const profile = await loadArtistProfile();
                          if (profile) {
                            setArtistProfile(profile);
                            setToastMessage("Profile Found! Unlocking...");
                          } else {
                            setToastMessage("Still no profile found. Please complete setup in Settings.");
                          }
                          setIsLoading(false);
                        }}
                        isLoading={isLoading}
                      />
                    ) : (
                      <div className="max-w-3xl mx-auto flex flex-col pt-6 space-y-6">
                        {activeMessages.map((msg) => (
                          <ChatMessage key={msg.id} message={msg} onSaveLead={handleSaveLead} />
                        ))}
                        <div ref={messagesEndRef} className="h-4" />
                      </div>
                    )}
                  </div>

                  {/* Scroll rail + controls (right side) */}
                  <div className="pointer-events-none absolute right-3 top-24 bottom-28 flex flex-col items-center z-30">
                    <div className="w-1 flex-1 rounded-full bg-white/10 relative overflow-hidden">
                      <div
                        className="absolute left-0 right-0 rounded-full bg-white/50"
                        style={{
                          height: '40px',
                          top: `calc(${Math.min(100, Math.max(0, scrollProgress * 100))}% - 20px)`
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2 mt-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); scrollToTop(); }}
                        disabled={!isChatScrollable}
                        className={`pointer-events-auto w-10 h-10 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center transition-colors ${showScrollToTop ? 'text-white/90 hover:text-white' : 'text-white/40'} ${isChatScrollable ? 'hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}`}
                        aria-label="Scroll to top"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); scrollToBottom('smooth'); }}
                        disabled={!isChatScrollable}
                        className={`pointer-events-auto w-10 h-10 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center transition-colors ${showScrollToBottom ? 'text-white/90 hover:text-white' : 'text-white/40'} ${isChatScrollable ? 'hover:bg-white/10' : 'opacity-50 cursor-not-allowed'}`}
                        aria-label="Scroll to bottom"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer / Composer */}
                <div className="flex-shrink-0 bg-gradient-to-t from-visio-bg via-visio-bg to-transparent pt-10 pb-2 relative z-20">
                  <Composer
                    onSend={handleSendMessage}
                    isLoading={isLoading}
                    pendingPrompt={pendingPrompt}
                    onPromptUsed={() => setPendingPrompt(null)}
                    webSearchEnabled={webSearchEnabled}
                    onToggleWebSearch={() => setWebSearchEnabled(prev => !prev)}
                    isRestricted={!isApproved}
                  />
                </div>
              </>
            ) : currentView === 'leads' ? (
              <LeadsGallery
                leads={allLeads}
                onSaveLead={handleSaveLead}
                isRestricted={!isApproved}
              />
            ) : currentView === 'billing' ? (
              <Billing
                currentSubscription={subscription}
                onUpgrade={handleUpgrade}
                userEmail={user?.email}
              />
            ) : currentView === 'reason' ? (
              <ReasonPage onBack={() => navigateTo('overview')} />
            ) : currentView === 'reach' ? (
              <ReachPage onBack={() => navigateTo('overview')} />
            ) : currentView === 'settings' ? (
              <SettingsPage
                subscription={subscription}
                artistProfile={artistProfile}
                onBack={() => navigateTo('overview')}
                onNavigateHome={() => navigateTo('overview')}
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
        </>
      )}
    </div>
  );
}
