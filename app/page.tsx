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
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { HowToUsePage } from './components/HowToUsePage';
import { Marketplace } from './components/Marketplace';
import ReasonPage from './reason/page';
import ReachPage from './reach/page';
import { Toast } from './components/Toast';
import { ToolsPanel } from './components/ToolsPanel';
import { LeadGenWizard, LeadGenConfig } from './components/LeadGenWizard';
import { LeadGenProgress } from './components/LeadGenProgress';
import { Message, Role, Campaign, ViewMode, Lead, Session, ArtistProfile, Subscription, SubscriptionTier, AgentMode, ToolId, LeadList, StrategyBrief } from './types';
import { AITier } from './components/Composer';
import { Menu, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { BackgroundBeams } from './components/ui/background-beams';
import { CommandMenu, COMMAND_ACTIONS, ACTION_PROMPTS } from './components/ui/command-menu';
import { useAuth } from '@/lib/auth-context';
import { trackEvent } from '@/lib/analytics';
import {
  saveArtistProfile,
  loadArtistProfile,
  saveOnboardingComplete,
  checkOnboardingComplete,
  saveSessions,
  loadSessions,
  deleteSession,
  loadSubscription,
  updateSubscription,
  saveLeads,
  loadStrategyBriefs,
  saveStrategyBrief,
  createFolder,
  loadFolders
} from '@/lib/data-service';
import { generateLeadListCSV, downloadCSV } from '@/lib/csv-export';

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
    content: `## Let's transform your career.\n\nI'm **Visio** — your elite PR strategist. Think Columbia Records publicist meets AI-powered music industry advisor.\n\n**What I do best:**\n- **Find your people** — playlist curators, journalists, bloggers, DJs, A&R, across any market\n- **Craft your story** — pitch emails, press releases, social content packs\n- **Plan your rise** — campaign timelines, budget breakdowns, release strategies\n\n**Try saying:**\n- *"Find me 50 Amapiano playlist curators in South Africa"*\n- *"Draft a pitch email for my new single"*\n- *"How should I plan my album rollout?"*\n\nOr just chat — I know this industry inside out. What are we working on?`,
    timestamp: Date.now()
  }]
});

export default function Home() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const isApproved = user?.app_metadata?.approved === true;
  const [isAdmin, setIsAdmin] = useState(false);
  const isRestricted = !isApproved && !isAdmin;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [creditsAllocation, setCreditsAllocation] = useState<number | string | null>(null);
  const userId = user?.id;

  // Check admin status via server endpoint (avoids leaking admin emails in client bundle)
  useEffect(() => {
    if (!user || !session?.access_token) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetch('/api/admin/check', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data) setIsAdmin(!!data.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => { cancelled = true; };
  }, [user, session?.access_token]);

  // State: Views and Sessions
  const [currentView, setCurrentView] = useState<ViewMode>('landing'); // Default safe state

  // Initialize sessions list
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [strategyBriefs, setStrategyBriefs] = useState<Map<string, StrategyBrief>>(new Map());
  const [subscription, setSubscription] = useState<Subscription>({
    tier: 'artist',
    status: 'active',
    currentPeriodEnd: 0, // Will be set client-side
    interval: 'month'
  });
  const effectiveSubscription = useMemo<Subscription>(() => {
    if (!isAdmin) return subscription;
    // Admin accounts should not be feature-gated by plan.
    return { ...subscription, tier: 'enterprise', status: 'active' };
  }, [isAdmin, subscription]);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<{ setInput: (text: string) => void }>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isChatAtBottomRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
  const bootstrappedProfileRef = useRef<string | null>(null);

  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [artistContextEnabled, setArtistContextEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId>('none');
  const [showLeadGenWizard, setShowLeadGenWizard] = useState(false);
  const [leadGenProgress, setLeadGenProgress] = useState<{ tier: string; status: string; found: number; target: number; currentSource: string; logs: string[] } | null>(null);
  const [isGeneratingLeads, setIsGeneratingLeads] = useState(false);
  const [campaignFolders, setCampaignFolders] = useState<Campaign[]>([]);
  const [isChatScrollable, setIsChatScrollable] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [buildInfo, setBuildInfo] = useState<{ commit?: string | null; branch?: string | null } | null>(null);

  // Lightweight build marker so we can confirm the live site is running the latest deployment.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/build-info')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled) return;
        if (data && typeof data === 'object') setBuildInfo(data);
      })
      .catch(() => {
        // ignore
      });
    return () => { cancelled = true; };
  }, []);

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
    // IMPORTANT: Supabase auth also uses localStorage. Storing full chat history locally for
    // signed-in users can fill the quota and cause auth tokens to fail to persist, which
    // looks like random logouts on refresh/background. For signed-in users we rely on Supabase.
    if (user) return;
    try {
      window.localStorage.setItem(localSessionsKey(), JSON.stringify(nextSessions));
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [localSessionsKey, user]);

  // If a previous build stored large authenticated chat histories in localStorage, clear them
  // once the user is signed in to prevent storage-quota auth issues.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return;
    try {
      window.localStorage.removeItem(localSessionsKey());
    } catch {
      // ignore
    }
  }, [user, localSessionsKey]);

  // Ensure `profiles` row exists for this auth user (required by FK constraints).
  useEffect(() => {
    const token = session?.access_token;
    if (!user || !token) return;
    if (bootstrappedProfileRef.current === user.id) return;
    bootstrappedProfileRef.current = user.id;

    fetch('/api/bootstrap/profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).then(async (res) => {
      if (res.ok) return;
      const data = await res.json().catch(() => ({}));
      throw new Error((data as any)?.error || res.statusText || 'Bootstrap failed');
    }).catch((err) => {
      console.error('Profile bootstrap failed:', err);
      setPersistenceWarning(`Supabase profile bootstrap failed: ${err?.message || 'unknown error'}`);
    });
  }, [user, session?.access_token]);

  const attemptRemoteSave = useCallback(async (nextSessions: Session[]) => {
    if (!user) return true;
    try {
      const result = await saveSessions(nextSessions);
      if (!result.ok) {
        // Show the actual error to make production setup issues (missing tables/RLS) diagnosable.
        setPersistenceWarning(`Supabase sync failed: ${result.error}`);
        return false;
      }
      setPersistenceWarning(null);
      return true;
    } catch (error) {
      console.error('Supabase sync failed:', error);
      setPersistenceWarning('Supabase sync failed (unexpected error).');
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
          // Social Auth First Run: No profile exists yet. Auto-create one to prevent "Portal Gate" lock.
          console.log("Creating default profile for new Social Auth user...");

          const metadata = user.user_metadata || {};
          const name = metadata.name || metadata.full_name || user.email?.split('@')[0] || 'Artist';

          const defaultProfile: ArtistProfile = {
            name: name,
            genre: '',
            description: '',
            socials: { email: user.email },
            connectedAccounts: {},
            similarArtists: [],
            milestones: { instagramFollowers: 0, monthlyListeners: 0 },
            location: { city: '', country: '' },
            promotionalFocus: 'Streaming',
            careerHighlights: [],
            lifeHighlights: [],
            desiredCommunities: []
          };

          // Save and set immediately
          await saveArtistProfile(defaultProfile);
          setArtistProfile(defaultProfile);

          // Launch Tutorial for first-timers
          const tutorialDone = userId ? localStorage.getItem(`visio:tutorial_complete:${userId}`) === 'true' : false;
          if (!tutorialDone) {
            setShowTutorial(true);
            trackEvent('tutorial_started');
          }
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
      else if (path === '/help') targetView = 'help';
      else if (path === '/marketplace') targetView = 'marketplace';
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
        // Logged In - Check onboarding/profile
        if (!hasCompletedOnboarding && !hasProfile) {
          // Profile gate is handled inside the dashboard view
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

    // Track sign-in
    trackEvent('sign_in');

    // Check if tutorial has been completed
    const tutorialDone = userId ? localStorage.getItem(`visio:tutorial_complete:${userId}`) === 'true' : false;

    // Only check if profile exists
    if (profile) {
      setArtistProfile(profile);
      navigateTo('overview');
    } else {
      // No profile found - show tutorial for new users, then overview
      if (!tutorialDone) {
        setShowTutorial(true);
        trackEvent('tutorial_started');
      }
      console.log("No profile found, will show gate");
      navigateTo('overview');
    }
  };

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);

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

  // Fetch credits from API
  useEffect(() => {
    if (!user || authLoading || !session?.access_token) return;
    let cancelled = false;
    fetch('/api/user/credits', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        setCreditsBalance(data.balance ?? 0);
        setCreditsAllocation(data.monthlyAllocation ?? 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, authLoading, session?.access_token, subscription.tier]);

  // Load campaign folders from Supabase on auth
  useEffect(() => {
    if (!user || authLoading) return;
    loadFolders().then(folders => {
      if (folders.length > 0) {
        setCampaignFolders(folders.map(f => ({ id: f.id, name: f.name, client: '', status: f.status as Campaign['status'] || 'active' })));
      }
    }).catch(() => {});
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

      const [loadedSessions, briefs] = await Promise.all([loadSessions(), loadStrategyBriefs()]);
      if (briefs.size > 0) setStrategyBriefs(briefs);
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
  // Sync to Storage on Change (Debounced)
  useEffect(() => {
    if (!user || sessions.length === 0) return;

    // Save to LocalStorage immediately
    saveLocalSessions(sessions);
    if (activeSessionId) {
      window.localStorage.setItem(localLastSessionKey(), activeSessionId);
    }

    // Debounce Remote Save
    const timeout = setTimeout(() => {
      attemptRemoteSave(sessions);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [sessions, activeSessionId, user, saveLocalSessions, localLastSessionKey, attemptRemoteSave]);

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
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    navigateTo('dashboard');
  };

  // Helper Handlers
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    navigateTo('dashboard');
  };

  const handleDeleteSession = async (id: string) => {
    // Optimistic Update
    const newSessions = sessions.filter(s => s.id !== id);
    let nextId = '';

    if (activeSessionId === id) {
      nextId = newSessions[0]?.id || '';
    } else {
      nextId = activeSessionId;
    }

    setSessions(newSessions);
    setActiveSessionId(nextId);

    // Persist
    saveLocalSessions(newSessions);
    await deleteSession(id);

    if (newSessions.length === 0) {
      // Re-init if empty
      const initial = createInitialSession();
      setSessions([initial]);
      setActiveSessionId(initial.id);
    }
  };

  const handleMoveSession = async (sessionId: string, folderId: string | null) => {
    // Check Campaign Cap
    if (folderId) {
      // Moving to a folder - check limit? 
      // Logic for limits handled in creation, moving existing is fine for now.
    }

    const newSessions = sessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, folderId, lastUpdated: Date.now() };
      }
      return s;
    });
    setSessions(newSessions);
    // Persist handled by effect
  };

  const handleShareSession = (sessionId: string) => {
    // Generate Share Link (Mock)
    const url = `${window.location.origin}/share/${sessionId}`;
    navigator.clipboard.writeText(url);
    setToastMessage('Link copied to clipboard');
  };

  const handleSendMessage = async (text: string, tier: AITier = 'instant', mode: AgentMode = 'chat') => {
    // --- Access Control / Mode Locking ---
    const userTier = effectiveSubscription.tier;

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
    if (!isAdmin && !allowedTiers.includes(tier)) {
      setToastMessage(`Upgrade to ${userTier === 'artist' ? 'Starter' : 'Label'} to use ${tier.toUpperCase()} mode.`);
      return; // BLOCK ACTION
    }

    // -------------------------------------

    const activeSessionIndex = sessions.findIndex(s => s.id === activeSessionId);
    if (activeSessionIndex === -1) return;

    const currentSession = sessions[activeSessionIndex];

    // --- INTERCEPT IMPORT COMMAND ---
    if (text.startsWith('IMPORT_PORTAL_DATA:')) {
      try {
        const jsonStr = text.replace('IMPORT_PORTAL_DATA:', '').trim();
        const raw = JSON.parse(jsonStr);

        // Validate required fields to prevent arbitrary JSON injection
        if (typeof raw.name !== 'string' || !raw.name.trim()) {
          setToastMessage("❌ Import Failed: Profile must have a name.");
          return;
        }

        const profileData: ArtistProfile = {
          name: String(raw.name).slice(0, 200),
          genre: typeof raw.genre === 'string' ? raw.genre.slice(0, 100) : '',
          description: typeof raw.description === 'string' ? raw.description.slice(0, 2000) : '',
          socials: typeof raw.socials === 'object' && raw.socials ? raw.socials : {},
          connectedAccounts: typeof raw.connectedAccounts === 'object' && raw.connectedAccounts ? raw.connectedAccounts : {},
          similarArtists: Array.isArray(raw.similarArtists) ? raw.similarArtists.filter((s: unknown) => typeof s === 'string').slice(0, 20) : [],
          milestones: typeof raw.milestones === 'object' && raw.milestones ? raw.milestones : { instagramFollowers: 0, monthlyListeners: 0 },
          location: typeof raw.location === 'object' && raw.location ? { city: String(raw.location.city || ''), country: String(raw.location.country || '') } : { city: '', country: '' },
          promotionalFocus: ['Streaming', 'Live Events', 'Brand Deals', 'Press'].includes(raw.promotionalFocus) ? raw.promotionalFocus : 'Streaming',
          careerHighlights: Array.isArray(raw.careerHighlights) ? raw.careerHighlights.filter((s: unknown) => typeof s === 'string').slice(0, 20) : [],
          lifeHighlights: Array.isArray(raw.lifeHighlights) ? raw.lifeHighlights.filter((s: unknown) => typeof s === 'string').slice(0, 20) : [],
          desiredCommunities: Array.isArray(raw.desiredCommunities) ? raw.desiredCommunities.filter((s: unknown) => typeof s === 'string').slice(0, 20) : [],
        };

        // Optimistically update local state
        setArtistProfile(profileData);

        // Save to DB
        await saveArtistProfile(profileData);

        setToastMessage("✅ Artist Profile Imported Successfully!");

        // Add system message confirming import
        const importMsg: Message = {
          id: crypto.randomUUID(),
          role: Role.AGENT,
          content: `✅ **Profile Imported**: I've updated your context with data for **${profileData.name}**.\n\nI now know your genre (${profileData.genre}), location, and brand voice. Let's get to work!`,
          timestamp: Date.now()
        };

        const newHistory = [...currentSession.messages, importMsg];
        const updatedSession = { ...currentSession, messages: newHistory, lastUpdated: Date.now() };
        const updatedSessions = [...sessions];
        updatedSessions[activeSessionIndex] = updatedSession;
        setSessions(updatedSessions);
        return;

      } catch (e) {
        setToastMessage("❌ Import Failed: Invalid JSON format.");
        return;
      }
    }

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

      const accessToken = session?.access_token;
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: historyForApi,
          artistContext: artistProfile, // Ignored by backend (source of truth is server fetch)
          tier,
          mode,
          webSearchEnabled,
          artistContextEnabled,
          activeTool
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
            webResults: data.webResults || [],
            toolUsed: data.toolUsed || (Array.isArray(data.toolsUsed) ? data.toolsUsed[data.toolsUsed.length - 1] : undefined),
            isThinking: false
          };
        }
        return msg;
      });

      const finalSession = { ...sessionWithThinking, messages: finalMessages };
      updatedSessions[activeSessionIndex] = finalSession;
      setSessions([...updatedSessions]);

      // Generate strategy brief if leads were returned
      if (data.leads && data.leads.length > 0) {
        fetch('/api/generate-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: finalSession.id, messages: finalSession.messages.slice(-20).map(m => ({ role: m.role, content: m.content })) })
        })
          .then(r => r.json())
          .then(brief => {
            if (brief && brief.summary) {
              setStrategyBriefs(prev => new Map(prev).set(finalSession.id, brief));
              saveStrategyBrief(brief).catch(() => { });
            }
          })
          .catch(() => { });
      }

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

  const handleSaveLead = async (lead: Lead) => {
    try {
      const success = await saveLeads([{
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        title: lead.title,
        source: lead.source,
        metadata: {
          matchScore: lead.matchScore,
          followers: lead.followers,
          country: lead.country,
          socials: lead.socials,
          snippet: lead.snippet,
        }
      }]);
      setToastMessage(success ? `Saved lead: ${lead.name}` : 'Failed to save lead');
    } catch {
      setToastMessage('Failed to save lead');
    }
  };

  // Handle tool selection — open wizard for generate_leads
  const handleToolSelect = (tool: ToolId) => {
    if (tool === 'generate_leads') {
      setShowLeadGenWizard(true);
      return;
    }
    setActiveTool(tool);
  };

  // Handle lead gen wizard submission via SSE
  const handleLeadGenSubmit = async (config: LeadGenConfig) => {
    setShowLeadGenWizard(false);
    setIsGeneratingLeads(true);
    setLeadGenProgress({ tier: 'Tier 1', status: 'searching', found: 0, target: 50, currentSource: 'Initializing...', logs: [] });

    // Navigate to dashboard if not there
    if (currentView !== 'dashboard') navigateTo('dashboard');

    const params = new URLSearchParams({
      contactTypes: config.contactTypes.join(','),
      markets: config.markets.join(','),
      genre: config.genre,
      searchDepth: config.searchDepth,
      targetCount: '50',
    });

    try {
      const accessToken = session?.access_token;
      const res = await fetch(`/api/agent/lead-stream?${params.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!res.ok) {
        setToastMessage('Lead generation failed. Please try again.');
        setIsGeneratingLeads(false);
        setLeadGenProgress(null);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setIsGeneratingLeads(false);
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'progress') {
              setLeadGenProgress({
                tier: event.tier || 'Searching',
                status: event.status || 'searching',
                found: event.found || 0,
                target: event.target || 50,
                currentSource: event.currentSource || '',
                logs: event.logs || [],
              });
            } else if (event.type === 'complete') {
              // Play notification sound
              try { new Audio('/sounds/ting.mp3').play().catch(() => {}); } catch {}

              setToastMessage(`Found ${event.total || event.contacts?.length || 0} leads!`);

              // Inject leads into the active session as an agent message
              const activeIdx = sessions.findIndex(s => s.id === activeSessionId);
              if (activeIdx !== -1 && event.contacts?.length > 0) {
                const leadMsg: Message = {
                  id: crypto.randomUUID(),
                  role: Role.AGENT,
                  content: `## Lead Generation Complete\n\nFound **${event.contacts.length}** contacts matching your criteria.\n\n**Search:** ${config.contactTypes.join(', ')} in ${config.markets.join(', ')} (${config.genre})\n**Depth:** ${config.searchDepth}`,
                  leads: event.contacts.map((c: any, i: number) => ({
                    id: c.email || `lead-${i}`,
                    name: c.name || 'Unknown',
                    title: c.title || '',
                    company: c.company || '',
                    email: c.email || '',
                    matchScore: 0,
                    socials: { instagram: c.instagram, tiktok: c.tiktok, twitter: c.twitter, linkedin: c.linkedin },
                    source: c.source || 'Pipeline',
                    followers: c.followers || '',
                    country: c.country || '',
                    snippet: c.url || '',
                  })),
                  timestamp: Date.now(),
                  toolUsed: 'generate_leads',
                };

                const currentSession = sessions[activeIdx];
                const updatedSession = { ...currentSession, messages: [...currentSession.messages, leadMsg], lastUpdated: Date.now() };
                const next = [...sessions];
                next[activeIdx] = updatedSession;
                setSessions(next);
              }
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      console.error('Lead gen stream error:', error);
      setToastMessage('Lead generation encountered an error.');
    } finally {
      setIsGeneratingLeads(false);
      setLeadGenProgress(null);
    }
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    // In real app, redirect to Stripe
    updateSubscription({ tier });
    setSubscription(prev => ({ ...prev, tier }));
    setToastMessage(`Upgraded to ${tier.toUpperCase()} plan!`);
    navigateTo('overview');
  };

  // --- Derived Data ---

  const leadLists: LeadList[] = useMemo(() => {
    const lists: LeadList[] = [];
    sessions.forEach(session => {
      const sessionLeads: Lead[] = [];
      session.messages.forEach(msg => {
        if (msg.leads && msg.leads.length > 0) {
          sessionLeads.push(...msg.leads);
        }
        const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = msg.content.match(jsonBlockRegex);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            if (!msg.leads || msg.leads.length === 0) {
              sessionLeads.push(...parsed);
            }
          } catch { }
        }
      });
      if (sessionLeads.length > 0) {
        const unique = new Map<string, Lead>();
        sessionLeads.forEach(l => unique.set(l.id || l.name, l));
        lists.push({
          id: session.id,
          sessionId: session.id,
          title: session.title,
          brief: strategyBriefs.get(session.id) || null,
          leads: Array.from(unique.values()),
          country: strategyBriefs.get(session.id)?.country || undefined,
          createdAt: session.lastUpdated,
        });
      }
    });
    return lists.sort((a, b) => b.createdAt - a.createdAt);
  }, [sessions, strategyBriefs]);

  const allLeads = useMemo(() => leadLists.flatMap(ll => ll.leads), [leadLists]);

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

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Lead Gen Wizard */}
      <LeadGenWizard
        isOpen={showLeadGenWizard}
        onClose={() => setShowLeadGenWizard(false)}
        onSubmit={handleLeadGenSubmit}
        defaultGenre={artistProfile?.genre || ''}
        defaultMarket={artistProfile?.location?.country || undefined}
      />

      {/* Onboarding Tutorial Overlay */}
      {showTutorial && (
        <OnboardingTutorial
          userId={userId || undefined}
          onComplete={() => setShowTutorial(false)}
          onNavigate={(view) => {
            setShowTutorial(false);
            navigateTo(view as ViewMode);
          }}
        />
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
        <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden relative z-10">
          <LandingPage
            onGetStarted={handleGetStarted}
            onLogin={handleLogin}
          />
        </div>
      ) : currentView === 'auth' ? (
        <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden relative z-10">
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
            campaigns={campaignFolders}
            sessions={sessions}
            onCreateFolder={async (name: string) => {
              const folder = await createFolder(name);
              if (folder) {
                setCampaignFolders(prev => [{ id: folder.id, name: folder.name, client: '', status: 'active' as const }, ...prev]);
                setToastMessage(`Folder "${name}" created`);
              } else {
                setToastMessage('Failed to create folder');
              }
            }}
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
            subscription={effectiveSubscription}
            artistProfile={artistProfile}
            isRestricted={isRestricted}
            isAdmin={isAdmin}
            creditsBalance={creditsBalance}
            creditsAllocation={creditsAllocation}
          />

          {/* Mobile Sidebar Overlay Backdrop - Fixed z-index */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            />
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col md:ml-64 relative z-10 h-full min-h-0 bg-visio-bg/50 overflow-y-auto overflow-x-hidden">

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
                {buildInfo?.commit ? (
                  <span className="font-mono text-white/20">
                    {String(buildInfo.commit).slice(0, 7)}
                  </span>
                ) : null}
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
                  stats={{
                    leads: allLeads.length,
                    actions: sessions.reduce((acc, s) => acc + s.messages.length, 0),
                    campaigns: leadLists.length
                  }}
                  leadLists={leadLists}
                  onExportLeadList={(list) => {
                    const csv = generateLeadListCSV(list);
                    const filename = `visio-leads-${list.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
                    downloadCSV(csv, filename);
                    setToastMessage(`Exported ${list.leads.length} leads to CSV`);
                  }}
                  onOpenSession={(sessionId) => {
                    setActiveSessionId(sessionId);
                    navigateTo('dashboard');
                  }}
                  subscription={effectiveSubscription}
                  creditsBalance={creditsBalance}
                  creditsAllocation={creditsAllocation}
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
                        onOpenSettings={() => navigateTo('settings')}
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
                        {activeMessages.length > 0 ? (
                          <>
                            {activeMessages.map((msg) => (
                              <ChatMessage key={msg.id} message={msg} onSaveLead={handleSaveLead} />
                            ))}
                            {isGeneratingLeads && (
                              <LeadGenProgress isActive={isGeneratingLeads} progress={leadGenProgress} />
                            )}
                            <div ref={messagesEndRef} className="h-4" />
                          </>
                        ) : (
                          // Empty State with Suggested Actions -- Enhances UX for "stagnant" feeling
                          <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-visio-teal/20 to-visio-sage/20 border border-visio-teal/30 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(182,240,156,0.1)]">
                              <span className="text-2xl font-bold bg-gradient-to-br from-visio-teal to-visio-sage bg-clip-text text-transparent">V</span>
                            </div>
                            <div className="space-y-2 max-w-md px-4">
                              <h3 className="text-2xl font-semibold text-white">How can I help today?</h3>
                              <p className="text-white/40 text-sm">I can find industry contacts, draft pitches, plan campaigns, or research competitors for you.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg px-4">
                              {[
                                { label: "Find Playlist Curators", prompt: "Find playlist curators for my genre", icon: "🎵" },
                                { label: "Draft a Pitch Email", prompt: "Help me draft a pitch email for a music blog", icon: "✉️" },
                                { label: "Research Competitors", prompt: "Research similar artists in my genre and their strategy", icon: "🔍" },
                                { label: "Plan a Release Campaign", prompt: "Create a 4-week release campaign plan for my next single", icon: "📅" }
                              ].map((action, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSendMessage(action.prompt)}
                                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-visio-teal/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-left text-sm group"
                                >
                                  <span className="text-xl group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
                                  <span className="text-white/70 group-hover:text-white font-medium">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tools Panel (desktop) */}
                  <div className="hidden lg:block absolute right-16 top-24 z-30">
                    <ToolsPanel
                      activeTool={activeTool}
                      onSelect={handleToolSelect}
                      webSearchEnabled={webSearchEnabled}
                    />
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
                    artistContextEnabled={artistContextEnabled}
                    onToggleArtistContext={() => setArtistContextEnabled(prev => !prev)}
                    isRestricted={isRestricted}
                    subscriptionTier={effectiveSubscription.tier}
                    creditsBalance={creditsBalance}
                  />
                </div>
              </>
            ) : currentView === 'leads' ? (
              <LeadsGallery
                leads={allLeads}
                onSaveLead={handleSaveLead}
                isRestricted={isRestricted}
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
                subscription={effectiveSubscription}
                artistProfile={artistProfile}
                onBack={() => navigateTo('overview')}
                onNavigateHome={() => navigateTo('overview')}
                onLogout={handleLogout}
              />
            ) : currentView === 'marketplace' ? (
              <Marketplace
                onNewChat={handleNewChat}
                subscriptionTier={effectiveSubscription.tier}
              />
            ) : currentView === 'help' ? (
              <HowToUsePage
                onNavigate={navigateTo}
                onRelaunchTutorial={() => setShowTutorial(true)}
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
