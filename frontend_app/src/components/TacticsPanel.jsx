import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, BookOpen, Zap } from 'lucide-react';
import { PINNED_TACTICS, EXTENDED_TACTICS, DifficultyBar } from './TacticsShowcase';
import { WithTooltip } from './TacticsShowcase';

// All tactics combined for the war room
const ALL_TACTICS = [...PINNED_TACTICS, ...EXTENDED_TACTICS];

const TAG_COLORS = {
    crimson: 'border-crimson-800/60 text-crimson-700 bg-crimson-950/20',
    gold: 'border-gold-800/60 text-gold-700 bg-gold-950/10',
    obsidian: 'border-obsidian-700 text-obsidian-600',
};

// Compact tactic button for the war room grid
const TacticButton = memo(({ tactic, onSelect, isTransmitting }) => (
    <WithTooltip tactic={tactic}>
        <button
            onClick={() => onSelect(tactic.name)}
            disabled={isTransmitting}
            className={`
                w-full text-left p-3 rounded-sm border transition-all duration-150 group
                disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 select-none
                ${tactic.tagColor === 'crimson'
                    ? 'border-crimson-900/40 hover:border-crimson-700 hover:bg-crimson-950/30 bg-obsidian-950/50'
                    : tactic.tagColor === 'gold'
                        ? 'border-gold-900/30 hover:border-gold-700 hover:bg-gold-950/20 bg-obsidian-950/50'
                        : 'border-obsidian-800 hover:border-obsidian-600 hover:bg-obsidian-800/60 bg-obsidian-950/30'
                }
            `}
        >
            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                <span className={`text-[7px] font-bold tracking-wider border px-1 py-0.5 rounded-sm shrink-0 ${TAG_COLORS[tactic.tagColor] || TAG_COLORS.obsidian}`}>
                    {tactic.tag}
                </span>
                <DifficultyBar level={tactic.difficulty} small />
            </div>
            <p className="text-[11px] font-bold text-obsidian-300 group-hover:text-white transition-colors leading-tight">
                {tactic.name}
            </p>
        </button>
    </WithTooltip>
));
TacticButton.displayName = 'TacticButton';

// Full war-room tactics panel
const TacticsPanel = memo(({ onSelect, isTransmitting, compact = false }) => {
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);

    const filtered = ALL_TACTICS.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tag.toLowerCase().includes(search.toLowerCase())
    );

    const visible = search ? filtered : showAll ? filtered : PINNED_TACTICS;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className={`flex items-center justify-between gap-2 border-b border-obsidian-800 shrink-0 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
                <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-gold-600" />
                    <span className="text-[9px] font-bold tracking-[0.2em] text-gold-600 uppercase">Tactical Doctrine</span>
                </div>
                <span className="text-[8px] text-obsidian-700">{ALL_TACTICS.length} tactics</span>
            </div>

            {/* Search */}
            <div className={`shrink-0 border-b border-obsidian-800 ${compact ? 'p-2' : 'p-3'}`}>
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-obsidian-900/60 border border-obsidian-800 rounded-sm">
                    <Search className="w-3 h-3 text-obsidian-600 shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search tactics..."
                        className="flex-1 bg-transparent text-[10px] text-obsidian-300 placeholder-obsidian-700 outline-none"
                    />
                    {search && (
                        <button onClick={() => setSearch('')}>
                            <X className="w-2.5 h-2.5 text-obsidian-600 hover:text-obsidian-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tactic notice */}
            <div className="px-3 py-2 bg-gold-950/10 border-b border-gold-900/20 shrink-0">
                <p className="text-[8px] text-gold-800 tracking-widest flex items-center gap-1.5">
                    <Zap className="w-2.5 h-2.5 shrink-0" />
                    Click a tactic to issue it as a command. Hover for full dossier.
                </p>
            </div>

            {/* Grid of tactic buttons */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <div className="grid grid-cols-1 gap-1.5">
                    {visible.map(t => (
                        <TacticButton key={t.id} tactic={t} onSelect={onSelect} isTransmitting={isTransmitting} />
                    ))}
                </div>

                {/* Show more / less toggle (only when no search active) */}
                {!search && (
                    <button
                        onClick={() => setShowAll(s => !s)}
                        className="w-full mt-2 py-2.5 border border-dashed border-obsidian-800 rounded-sm text-[9px] font-bold uppercase tracking-widest text-obsidian-600 hover:border-obsidian-600 hover:text-obsidian-400 transition-all flex items-center justify-center gap-2"
                    >
                        {showAll ? (
                            <><ChevronDown className="w-3 h-3 rotate-180" /> Show Less</>
                        ) : (
                            <><ChevronDown className="w-3 h-3" /> +{EXTENDED_TACTICS.length} More Tactics</>
                        )}
                    </button>
                )}

                {search && filtered.length === 0 && (
                    <p className="text-center text-obsidian-700 text-[10px] py-6">No tactics match "{search}"</p>
                )}
            </div>
        </div>
    );
});
TacticsPanel.displayName = 'TacticsPanel';

export default TacticsPanel;
