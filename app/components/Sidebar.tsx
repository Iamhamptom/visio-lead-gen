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
    Lightbulb,
    Calculator,
    HelpCircle
} from 'lucide-react';
import { Campaign, ViewMode, Session, Subscription, ArtistProfile } from '../types';
import { PLAN_LIMITS } from '../config/plans';

interface SessionItemProps {
    session: Session;
    isActive: boolean;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    campaigns: Campaign[];
    onDelete: (id: string) => void;
    onMove: (id: string, folderId: string | null) => void;
    onShare: (id: string) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
    session,
    isActive,
    onClick,
    onDragStart,
    campaigns,
    onDelete,
    onMove,
    onShare
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
            className={`group relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            draggable
            onDragStart={(e) => onDragStart(e, session.id)}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare size={14} className={isActive ? 'text-visio-accent' : 'opacity-50'} />
                <span className="truncate text-sm">{session.title}</span>
            </div>

            {/* Options Trigger */}
            <button
                className={`p-1 rounded-md hover:bg-white/20 transition-opacity ${isActive || showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                    setShowMoveSubmenu(false);
                }}
            >
                <MoreHorizontal size={14} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
                <div
                    className="absolute right-0 top-8 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()} // Prevent close on inner click
                >
                    {showMoveSubmenu ? (
                        <>
                            <div className="px-2 py-1 text-[10px] text-white/30 font-bold uppercase border-b border-white/5 mb-1 flex justify-between items-center">
                                <span>Move to...</span>
                                <button onClick={() => setShowMoveSubmenu(false)} className="hover:text-white">Back</button>
                            </div>
                            <button
                                onClick={() => { onMove(session.id, null); setShowMenu(false); }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 text-xs text-white text-left"
                            >
                                <Inbox size={12} /> Inbox (Unfiled)
                            </button>
                            {campaigns.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { onMove(session.id, c.id); setShowMenu(false); }}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 text-xs text-white text-left truncate"
                                >
                                    <FolderOpen size={12} /> {c.name}
                                </button>
                            ))}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowMoveSubmenu(true)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 text-xs text-white text-left"
                            >
                                <FolderInput size={14} className="text-visio-teal" /> Move to Folder
                            </button>
                            <button
                                onClick={() => { onShare(session.id); setShowMenu(false); }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 text-xs text-white text-left"
                            >
                                <Share2 size={14} className="text-blue-400" /> Share Research
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            <button
                                onClick={() => { onDelete(session.id); setShowMenu(false); }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-xs text-red-400 text-left hover:text-red-300"
                            >
                                <Trash2 size={14} /> Delete
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
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active
            ? 'bg-white/10 text-white border border-white/5 shadow-inner'
            : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}>
        <span className={active ? 'text-visio-accent' : ''}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
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
    subscription?: Subscription;
    artistProfile: ArtistProfile | null;
    isRestricted?: boolean;
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
    subscription = { tier: 'artist', status: 'active', currentPeriodEnd: 0, interval: 'month' },
    artistProfile,
    isRestricted = false
}) => {

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
        fixed top-0 left-0 h-full w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 
        transition-transform duration-300 z-50 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        >
            {/* Brand Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-bold text-xl">V</div>
                    <span className="font-outfit text-xl font-medium tracking-tight">Visio<span className="opacity-50 font-light">AI</span></span>
                    {isRestricted && (
                        <div className="ml-2 px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[9px] font-bold border border-yellow-500/20 uppercase tracking-widest">
                            Preview
                        </div>
                    )}
                </div>
            </div>

            {/* Main Nav */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

                {/* Quick Actions */}
                <div className="px-3">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-visio-teal/20 to-visio-sage/20 border border-visio-teal/30 hover:border-visio-teal/50 text-visio-accent py-3 rounded-xl transition-all shadow-lg shadow-visio-teal/5 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-medium">Consult & Chat</span>
                    </button>
                </div>

                {/* Global Views */}
                <div className="space-y-1">
                    <NavItem
                        icon={<Home size={18} />}
                        label="Home"
                        active={activeView === 'overview'}
                        onClick={() => onNavigate('overview')}
                    />
                    {/* Inbox / Unfiled Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, null)}
                        className={`transition-colors rounded-xl ${activeView === 'dashboard' ? '' : ''}`}
                    >
                        <div className="px-4 py-2 flex items-center justify-between text-white/40 text-xs font-semibold uppercase tracking-wider mt-4 mb-2">
                            <span>Drafts / Inbox</span>
                            <Inbox size={12} />
                        </div>
                        {unfiledSessions.map(session => (
                            <SessionItem
                                key={session.id}
                                session={session}
                                isActive={activeSessionId === session.id && activeView === 'dashboard'}
                                onClick={() => onSelectSession(session.id)}
                                onDragStart={handleDragStart}
                                campaigns={campaigns}
                                onDelete={onDeleteSession}
                                onMove={onMoveSession}
                                onShare={onShareSession}
                            />
                        ))}
                        {unfiledSessions.length === 0 && (
                            <div className="px-4 py-2 text-xs text-white/20 italic">No unfiled research</div>
                        )}
                    </div>
                </div>

                {/* Campaigns Folders */}
                <div className="space-y-1 mt-6">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Campaign Folders</h4>
                        <button
                            onClick={() => alert("Folder creation coming soon!")} // Placeholder
                            className="text-white/30 hover:text-visio-teal transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {campaigns.map(c => {
                        const campaignSessions = sessions.filter(s => s.folderId === c.id);
                        const isExpanded = expandedFolders[c.id];

                        return (
                            <div
                                key={c.id}
                                className="mb-1"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, c.id)}
                            >
                                {/* Folder Header */}
                                <button
                                    onClick={() => toggleFolder(c.id)}
                                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FolderOpen size={16} className="text-visio-teal/60 group-hover:text-visio-teal flex-shrink-0" />
                                        <span className="truncate font-medium">{c.name}</span>
                                    </div>
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>

                                {/* Folder Contents */}
                                {isExpanded && (
                                    <div className="pl-2 mt-1 space-y-0.5 border-l border-white/5 ml-4">
                                        {campaignSessions.length === 0 ? (
                                            <div className="px-4 py-2 text-xs text-white/20">Empty folder</div>
                                        ) : (
                                            campaignSessions.map(session => (
                                                <SessionItem
                                                    key={session.id}
                                                    session={session}
                                                    isActive={activeSessionId === session.id && activeView === 'dashboard'}
                                                    onClick={() => onSelectSession(session.id)}
                                                    onDragStart={handleDragStart}
                                                    campaigns={campaigns}
                                                    onDelete={onDeleteSession}
                                                    onMove={onMoveSession}
                                                    onShare={onShareSession}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Billing Link */}
            <div className="px-3 mt-auto pt-4 space-y-2">
                <NavItem
                    icon={<HelpCircle size={18} />}
                    label="How to Use"
                    active={activeView === 'help'}
                    onClick={() => onNavigate('help')}
                />
                <button
                    onClick={() => onNavigate('billing')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${activeView === 'billing'
                        ? 'bg-visio-accent/10 border-visio-accent/20 text-visio-accent shadow-[0_0_15px_rgba(182,240,156,0.1)]'
                        : 'border-white/5 text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <div className={`p-1 rounded-md ${activeView === 'billing' ? 'bg-visio-accent text-black' : 'bg-white/10'}`}>
                        <CreditCard size={14} />
                    </div>
                    <span className="font-medium">Billing & Plans</span>
                </button>

            </div>

            {/* Plan Usage Widget */}
            <div className="px-3 pb-2">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/60 uppercase">{subscription.tier} Plan</span>
                        <a href="#" className="text-[10px] text-visio-accent hover:underline" onClick={() => onNavigate('billing')}>Upgrade</a>
                    </div>

                    {/* Mock Profile Usage - In real app, calculate from actual data */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/40">
                            <span>Profiles</span>
                            <span>1 / {PLAN_LIMITS[subscription.tier].maxProfiles === Infinity ? '∞' : PLAN_LIMITS[subscription.tier].maxProfiles}</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-visio-teal"
                                style={{ width: `${Math.min(100, (1 / (PLAN_LIMITS[subscription.tier].maxProfiles || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Profile */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <button
                    onClick={() => onNavigate('settings')}
                    className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-xl transition-colors text-left"
                >
                    <div className="w-8 h-8 rounded-full border border-white/20 bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-bold text-sm">
                        {artistProfile?.name?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{artistProfile?.name || 'Guest User'}</p>
                        <p className="text-xs text-white/40 truncate capitalize">{subscription.tier} Plan</p>
                    </div>
                    <Settings size={16} className="text-white/40" />
                </button>
                <div className="mt-4 px-2">
                    <p className="text-[10px] text-white/20 text-center leading-tight">
                        Powered by: VisioCorp<br />Copyright @ 2026 & Touchline Agency
                    </p>
                </div>
            </div>
        </aside>
    );
};
