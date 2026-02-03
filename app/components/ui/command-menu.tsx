"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Search, User, Briefcase, Mail, Settings, Plus, Sparkles, Users, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Custom event for command menu actions
export const COMMAND_ACTIONS = {
    CREATE_CAMPAIGN: 'visio:create-campaign',
    FIND_INFLUENCERS: 'visio:find-influencers',
    DRAFT_PITCH: 'visio:draft-pitch',
    NAVIGATE_INBOX: 'visio:navigate-inbox',
    NAVIGATE_SETTINGS: 'visio:navigate-settings',
};

// Pre-filled prompts for each action
export const ACTION_PROMPTS = {
    [COMMAND_ACTIONS.CREATE_CAMPAIGN]: "Help me create a campaign strategy for my upcoming release. I want to maximize exposure and engagement.",
    [COMMAND_ACTIONS.FIND_INFLUENCERS]: "Find influencers and playlist curators who would be a good fit for my music style.",
    [COMMAND_ACTIONS.DRAFT_PITCH]: "Draft a professional pitch email I can send to blogs, playlist curators, or press contacts about my music.",
};

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);

    // Toggle with Cmd+K
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const handleAction = (action: string) => {
        setOpen(false);
        // Dispatch custom event for the main page to handle
        window.dispatchEvent(new CustomEvent(action));
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 text-white"
                    >
                        <Command className="w-full bg-transparent">
                            <div className="flex items-center border-b border-white/10 px-4">
                                <Search className="mr-2 h-5 w-5 shrink-0 text-white/50" />
                                <Command.Input
                                    placeholder="Type a command or search..."
                                    className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-white/40 text-white selection:bg-visio-teal/30"
                                />
                                <div className="flex items-center gap-1 text-xs text-white/30">
                                    <span className="rounded bg-white/10 px-1 py-0.5">ESC</span>
                                </div>
                            </div>

                            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                                <Command.Empty className="py-6 text-center text-sm text-white/40">
                                    No results found.
                                </Command.Empty>

                                <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                                    <Item
                                        icon={<Plus className="text-visio-accent" />}
                                        shortcut="C"
                                        onSelect={() => handleAction(COMMAND_ACTIONS.CREATE_CAMPAIGN)}
                                    >
                                        Create Campaign
                                    </Item>
                                    <Item
                                        icon={<Users className="text-purple-400" />}
                                        shortcut="F"
                                        onSelect={() => handleAction(COMMAND_ACTIONS.FIND_INFLUENCERS)}
                                    >
                                        Find Influencers
                                    </Item>
                                    <Item
                                        icon={<FileText className="text-blue-400" />}
                                        shortcut="P"
                                        onSelect={() => handleAction(COMMAND_ACTIONS.DRAFT_PITCH)}
                                    >
                                        Draft Pitch
                                    </Item>
                                </Command.Group>

                                <div className="h-px bg-white/5 mx-2 my-2" />

                                <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                                    <Item
                                        icon={<Mail />}
                                        onSelect={() => handleAction(COMMAND_ACTIONS.NAVIGATE_INBOX)}
                                    >
                                        Inbox
                                    </Item>
                                    <Item
                                        icon={<Settings />}
                                        onSelect={() => handleAction(COMMAND_ACTIONS.NAVIGATE_SETTINGS)}
                                    >
                                        Settings
                                    </Item>
                                </Command.Group>

                                <div className="h-px bg-white/5 mx-2 my-2" />

                                <Command.Group heading="Recent Leads" className="px-2 py-1.5 text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                                    <Item icon={<User className="text-visio-teal" />}>Sarah Jenkins (Vogue)</Item>
                                    <Item icon={<User className="text-visio-teal" />}>Mike Ross (Sony)</Item>
                                </Command.Group>

                            </Command.List>
                        </Command>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function Item({
    children,
    shortcut,
    icon,
    onSelect,
}: {
    children: React.ReactNode;
    shortcut?: string;
    icon?: React.ReactNode;
    onSelect?: () => void;
}) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="group relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none data-[selected=true]:bg-visio-teal/20 data-[selected=true]:text-visio-accent transition-colors aria-selected:bg-visio-teal/20 aria-selected:text-visio-accent"
        >
            {icon && <span className="mr-2 h-4 w-4 opacity-70 group-data-[selected=true]:opacity-100">{icon}</span>}
            <span className="flex-1 opacity-90 group-data-[selected=true]:opacity-100">{children}</span>
            {shortcut && (
                <span className="ml-auto text-xs tracking-widest opacity-40 group-data-[selected=true]:opacity-70">
                    ⌘{shortcut}
                </span>
            )}
        </Command.Item>
    );
}
