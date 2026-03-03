import React, { useState } from 'react';
import {
    Plus,
    Home,
    FolderOpen,
    Settings,
    MessageSquare,
    MoreHorizontal,
    Trash2,
    FolderInput,
    Share2,
    ChevronDown,
    ChevronRight,
    Inbox,
    CreditCard,
    Shield,
    HelpCircle,
    Coins,
    Store,
    LayoutTemplate
} from 'lucide-react';
import { Campaign, ViewMode, Session, Subscription, ArtistProfile } from '../types';
import { PLAN_LIMITS } from '../config/plans';
import { TIER_DETAILS } from '../data/pricing';

interface SessionItemProps {
    session: Session;
    isActive: boolean;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    campaigns: Campaign[];
    onDelete: (id: string) => void;
    onMove: (id: string, folderId: string | null) => void;
    onShare: (id: string) => void;
    hasUnread?: boolean;
}

const SessionItem: React.FC<SessionItemProps> = ({
    session,
    isActive,
    onClick,
    onDragStart,
    campaigns,
    onDelete,
    onMove,
    onShare,
    hasUnread = false,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

    // Close menu when clicking outside (simple implementation)
    React.useEffect(() => {
        const handleClickOutside = () => {
            if (showMenu) setShowMenu(false);
        };
        if (showMenu) window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [showMenu]);

    return (
        <div
            className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-200 border ${
                isActive 
                    ? 'bg-white/[0.08] text-white border-white/[0.08] shadow-sm' 
                    : 'border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white'
            }`}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            draggable
            onDragStart={(e) => onDragStart(e, session.id)}
        >
            <div className="flex items-center gap-2.5 overflow-hidden">
                <MessageSquare size={13} className={`${isActive ? 'text-visio-teal' : 'opacity-40 group-hover:opacity-70'} transition-colors shrink-0`} />
                <span className="truncate text-sm font-medium">{session.title}</span>
                {hasUnread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] shrink-0" />
                )}
            </div>

            {/* Options Trigger */}
            <button
                className={`p-1 rounded-md hover:bg-white/10 transition-all ${isActive || showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                    setShowMoveSubmenu(false);
                }}
            >
                <MoreHorizontal size={14} className="text-white/50 hover:text-white" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
                <div
                    className="absolute right-2 top-8 w-48 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-50 overflow-hidden flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()} // Prevent close on inner click
                >
                    {showMoveSubmenu ? (
                        <>
                            <div className="px-2 py-1.5 text-[10px] text-white/40 font-semibold uppercase tracking-wider flex justify-between items-center mb-1">
                                <span>Move to...</span>
                                <button onClick={() => setShowMoveSubmenu(false)} className="hover:text-white transition-colors">Back</button>
                            </div>
                            <button
                                onClick={() => { onMove(session.id, null); setShowMenu(false); }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 text-xs text-white/80 hover:text-white text-left transition-colors"
                            >
                                <Inbox size={12} className="opacity-70" /> Inbox (Unfiled)
                            </button>
                            {campaigns.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { onMove(session.id, c.id); setShowMenu(false); }}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 text-xs text-white/80 hover:text-white text-left truncate transition-colors"
                                >
                                    <FolderOpen size={12} className="opacity-70" /> {c.name}
                                </button>
                            ))}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowMoveSubmenu(true)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 text-xs text-white/80 hover:text-white text-left transition-colors"
                            >
                                <FolderInput size={13} className="text-visio-teal" /> Move to Folder
                            </button>
                            <button
                                onClick={() => { onShare(session.id); setShowMenu(false); }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 text-xs text-white/80 hover:text-white text-left transition-colors"
                            >
                                <Share2 size={13} className="text-blue-400" /> Share Research
                            </button>
                            <div className="h-px bg-white/10 my-1 mx-1" />
                            <button
                                onClick={() => { onDelete(session.id); setShowMenu(false); }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-500/10 text-xs text-red-400 text-left hover:text-red-300 transition-colors"
                            >
                                <Trash2 size={13} /> Delete
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
    icon,
    label,
    active = false,
    onClick
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
            active
                ? 'bg-white/[0.08] text-white font-medium shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
        }`}>
        <span className={`relative z-10 transition-colors duration-200 ${active ? 'text-white' : 'text-white/50 group-hover:text-white/90'}`}>{icon}</span>
        <span className="relative z-10 text-sm tracking-wide">{label}</span>
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" />}
    </button>
);

interface SidebarProps {
    isOpen: boolean;
    activeView: ViewMode;
    activeSessionId: string;
    campaigns: Campaign[];
    sessions: Session[];
    onNavigate: (view: ViewMode) => void;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onMoveSession: (sessionId: string, folderId: string | null) => void;
    onDeleteSession: (sessionId: string) => void;
    onShareSession: (sessionId: string) => void;
    onCreateFolder?: (name: string) => void;
    subscription?: Subscription;
    artistProfile: ArtistProfile | null;
    isRestricted?: boolean;
    isAdmin?: boolean;
    creditsBalance?: number | null;
    creditsAllocation?: number | string | null;
    unreadLeadSessions?: Set<string>;
    onClearUnread?: (sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    activeView,
    activeSessionId,
    campaigns,
    sessions,
    onNavigate,
    onSelectSession,
    onNewChat,
    onMoveSession,
    onDeleteSession,
    onShareSession,
    onCreateFolder,
    subscription = { tier: 'artist', status: 'active', currentPeriodEnd: 0, interval: 'month' },
    artistProfile,
    isRestricted = false,
    isAdmin = false,
    creditsBalance = null,
    creditsAllocation = null,
    unreadLeadSessions,
    onClearUnread,
}) => {

    // Inline folder name input state (replaces window.prompt)
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // State for collapsible folders
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(
        campaigns.reduce((acc, c) => ({ ...acc, [c.id]: true }), {})
    );

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, sessionId: string) => {
        e.dataTransfer.setData('sessionId', sessionId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        const sessionId = e.dataTransfer.getData('sessionId');
        if (sessionId) {
            onMoveSession(sessionId, folderId);
        }
    };

    // Group sessions
    const unfiledSessions = sessions.filter(s => !s.folderId);

    return (
        <aside
            className={`
        fixed top-0 left-0 h-full w-[280px] max-w-[85vw] bg-[#030303]/95 backdrop-blur-2xl border-r border-white/5 
        transition-transform duration-500 ease-out z-50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.5)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        >
            {/* Brand Header */}
            <div className="h-[72px] flex items-center px-5 border-b border-white/5 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-visio-teal/5 to-transparent" />
                <div className="flex items-center gap-3 relative z-10 w-full">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-visio-teal to-visio-sage p-[1px] shadow-sm">
                       <div className="w-full h-full rounded-[7px] bg-[#111] flex items-center justify-center">
                          <span className="text-white font-bold text-sm">V</span>
                       </div>
                    </div>
                    <div className="flex flex-col leading-tight flex-1">
                      <span className="font-outfit text-lg font-semibold tracking-tight text-white">Visio<span className="text-visio-accent/90">AI</span></span>
                    </div>
                    {isRestricted && (
                        <div className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[8px] font-bold border border-yellow-500/20 uppercase tracking-wider">
                            Preview
                        </div>
                    )}
                </div>
            </div>

            {/* Main Nav */}
            <div className="flex-1 overflow-y-auto">
                {/* Quick Actions */}
                <div className="px-3 pb-2 pt-4">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-visio-teal to-visio-sage text-black py-2.5 rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(96,138,148,0.3)] hover:brightness-110 active:scale-[0.98] font-semibold text-sm"
                    >
                        <Plus size={16} className="transition-transform duration-300" />
                        <span>New Research</span>
                    </button>
                </div>

                {/* Global Views */}
                <div className="px-3 space-y-0.5 mt-2">
                    <NavItem
                        icon={<Home size={16} />}
                        label="Home"
                        active={activeView === 'overview'}
                        onClick={() => onNavigate('overview')}
                    />
                    <NavItem
                        icon={<LayoutTemplate size={16} />}
                        label="Templates"
                        active={activeView === 'templates'}
                        onClick={() => onNavigate('templates')}
                    />
                    <NavItem
                        icon={<Store size={16} />}
                        label="Marketplace"
                        active={activeView === 'marketplace'}
                        onClick={() => onNavigate('marketplace')}
                    />
                </div>

                {/* Drafts / Inbox (Unfiled) */}
                <div className="mt-6 px-3">
                    <div
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, null)}
                        className="transition-colors rounded-xl"
                    >
                        <div className="px-2 flex items-center justify-between text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2">
                            <span className="flex items-center gap-2">
                                Drafts / Inbox
                                {(unreadLeadSessions?.size || 0) > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                )}
                            </span>
                            <Inbox size={12} className="opacity-50" />
                        </div>
                        <div className="space-y-0.5">
                            {unfiledSessions.map(session => (
                                <SessionItem
                                    key={session.id}
                                    session={session}
                                    isActive={activeSessionId === session.id && activeView === 'dashboard'}
                                    onClick={() => {
                                        onSelectSession(session.id);
                                        if (unreadLeadSessions?.has(session.id) && onClearUnread) {
                                            onClearUnread(session.id);
                                        }
                                    }}
                                    onDragStart={handleDragStart}
                                    campaigns={campaigns}
                                    onDelete={onDeleteSession}
                                    onMove={onMoveSession}
                                    onShare={onShareSession}
                                    hasUnread={unreadLeadSessions?.has(session.id) || false}
                                />
                            ))}
                            {unfiledSessions.length === 0 && (
                                <div className="px-2 py-2 text-xs text-white/30 italic">No unfiled research</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Campaigns Folders */}
                <div className="mt-6 px-3 mb-6">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Campaign Folders</h4>
                        <button
                            onClick={() => setIsCreatingFolder(true)}
                            className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
                        >
                            <Plus size={12} />
                        </button>
                    </div>

                    {isCreatingFolder && (
                        <div className="px-2 mb-2">
                            <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newFolderName.trim() && onCreateFolder) {
                                        onCreateFolder(newFolderName.trim());
                                        setNewFolderName('');
                                        setIsCreatingFolder(false);
                                    }
                                    if (e.key === 'Escape') {
                                        setNewFolderName('');
                                        setIsCreatingFolder(false);
                                    }
                                }}
                                onBlur={() => {
                                    if (newFolderName.trim() && onCreateFolder) {
                                        onCreateFolder(newFolderName.trim());
                                    }
                                    setNewFolderName('');
                                    setIsCreatingFolder(false);
                                }}
                                placeholder="Folder name..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-visio-teal/50 transition-colors"
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        {campaigns.map(c => {
                            const campaignSessions = sessions.filter(s => s.folderId === c.id);
                            const isExpanded = expandedFolders[c.id];

                            return (
                                <div
                                    key={c.id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, c.id)}
                                    className="flex flex-col gap-0.5"
                                >
                                    {/* Folder Header */}
                                    <button
                                        onClick={() => toggleFolder(c.id)}
                                        className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-lg transition-colors group ${
                                            isExpanded ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <FolderOpen size={14} className={`${isExpanded ? 'text-visio-teal' : 'text-white/40 group-hover:text-white/70'} flex-shrink-0 transition-colors`} />
                                            <span className="truncate font-medium">{c.name}</span>
                                        </div>
                                        {isExpanded ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
                                    </button>

                                    {/* Folder Contents */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="pl-3 ml-3 border-l border-white/[0.08] space-y-0.5">
                                                {campaignSessions.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-xs text-white/30 italic">Empty folder</div>
                                                ) : (
                                                    campaignSessions.map(session => (
                                                        <SessionItem
                                                            key={session.id}
                                                            session={session}
                                                            isActive={activeSessionId === session.id && activeView === 'dashboard'}
                                                            onClick={() => {
                                                                onSelectSession(session.id);
                                                                if (unreadLeadSessions?.has(session.id) && onClearUnread) {
                                                                    onClearUnread(session.id);
                                                                }
                                                            }}
                                                            onDragStart={handleDragStart}
                                                            campaigns={campaigns}
                                                            onDelete={onDeleteSession}
                                                            onMove={onMoveSession}
                                                            onShare={onShareSession}
                                                            hasUnread={unreadLeadSessions?.has(session.id) || false}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Copyright info inside scrollable area before footer */}
                <div className="px-3 pb-4">
                    <p className="text-[10px] text-white/20 text-center leading-tight">
                        Powered by: VisioCorp<br />Copyright @ 2026 & Touchline Agency
                    </p>
                </div>
            </div>

            {/* Bottom Section (Links & Plan) */}
            <div className="px-3 pt-3 pb-3 space-y-4 border-t border-white/5 bg-[#030303]/80 backdrop-blur-xl shrink-0">
                {/* Admin/Help/Billing Links */}
                <div className="space-y-0.5">
                    {isAdmin && (
                        <button
                            onClick={() => { window.location.href = '/admin'; }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-white/60 hover:text-white hover:bg-white/[0.04] text-sm font-medium"
                        >
                            <Shield size={16} className="text-white/40" />
                            <span>Admin Dashboard</span>
                        </button>
                    )}
                    <NavItem
                        icon={<HelpCircle size={16} />}
                        label="How to Use"
                        active={activeView === 'help'}
                        onClick={() => onNavigate('help')}
                    />
                    <button
                        onClick={() => onNavigate('billing')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative text-sm font-medium ${
                            activeView === 'billing'
                                ? 'bg-white/[0.08] text-white shadow-sm'
                                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                        }`}
                    >
                        <CreditCard size={16} className={activeView === 'billing' ? 'text-visio-accent' : 'text-white/40'} />
                        <span className="relative z-10">Billing & Plans</span>
                        {activeView === 'billing' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-visio-accent rounded-r-full shadow-[0_0_8px_rgba(182,240,156,0.5)]" />}
                    </button>
                </div>

                {/* Plan Usage Widget */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{TIER_DETAILS[subscription.tier]?.name || subscription.tier}</span>
                        {subscription.tier !== 'enterprise' && (
                            <button className="text-[10px] font-medium text-visio-accent hover:text-white transition-colors bg-visio-accent/10 px-2 py-0.5 rounded-full" onClick={() => onNavigate('billing')}>Upgrade</button>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-white/50 font-medium">
                                <span className="flex items-center gap-1.5"><Coins size={12} className="text-amber-400/80" /> Credits</span>
                                <span>{creditsBalance ?? 0} / {creditsAllocation === 'unlimited' ? '∞' : (creditsAllocation ?? TIER_DETAILS[subscription.tier]?.credits ?? 0)}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                {(() => {
                                    const bal = creditsBalance ?? 0;
                                    const alloc = creditsAllocation === 'unlimited' ? 1 : (typeof creditsAllocation === 'number' ? creditsAllocation : (typeof TIER_DETAILS[subscription.tier]?.credits === 'number' ? TIER_DETAILS[subscription.tier].credits as number : 1));
                                    const pct = typeof alloc === 'number' && alloc > 0 ? Math.min(100, (bal / alloc) * 100) : 100;
                                    return (
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${pct > 50 ? 'bg-visio-teal' : pct > 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-white/50 font-medium">
                                <span>Profiles</span>
                                <span>1 / {PLAN_LIMITS[subscription.tier].maxProfiles === Infinity ? '∞' : PLAN_LIMITS[subscription.tier].maxProfiles}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white/20 transition-all duration-500"
                                    style={{ width: `${Math.min(100, (1 / (PLAN_LIMITS[subscription.tier].maxProfiles || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Profile */}
            <div className="p-3 border-t border-white/5 bg-[#030303] shrink-0">
                <button
                    onClick={() => onNavigate('settings')}
                    className="flex items-center gap-3 w-full p-2 hover:bg-white/[0.04] rounded-lg transition-all duration-200 text-left group"
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-visio-teal to-visio-sage p-[1.5px] shadow-sm">
                       <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center text-white font-bold text-sm group-hover:bg-black transition-colors">
                           {artistProfile?.name?.charAt(0)?.toUpperCase() || 'G'}
                       </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">{artistProfile?.name || 'Guest User'}</p>
                        <p className="text-xs text-white/40 truncate font-medium">{TIER_DETAILS[subscription.tier]?.name || subscription.tier}</p>
                    </div>
                    <Settings size={16} className="text-white/30 group-hover:text-white/70 transition-all group-hover:rotate-90 duration-300" />
                </button>
            </div>
        </aside>
    );
};
