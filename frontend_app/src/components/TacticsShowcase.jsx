import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, BookOpen, Search, X, Target, Crosshair, Shield, Eye } from 'lucide-react';

// ── Tactics data (imported/shared with war room) ──────────────────────────────

export const PINNED_TACTICS = [
    {
        id: 'pincer',
        name: 'Pincer Movement',
        primaryGoal: 'Physical Annihilation',
        requiredAttribute: 'Discipline & Timing',
        tag: 'ENCIRCLEMENT', tagColor: 'crimson', difficulty: 7,
        description: 'Two forces converge simultaneously on both flanks of an enemy position, trapping them in a lethal vice. The enemy cannot reinforce one side without exposing the other. Success depends entirely on synchronized timing — a botched pincer becomes a double-flank of your own.',
        historical: 'Battle of Cannae (216 BC) — Hannibal annihilated a Roman army twice his size, killing ~50,000 in a single afternoon.',
        scenario: 'Use when enemy is stationary and you have two independent mobile forces.',
    },
    {
        id: 'feigned-retreat',
        name: 'Feigned Retreat',
        primaryGoal: 'Breaking Formation',
        requiredAttribute: 'Deception',
        tag: 'PSYCHOLOGICAL', tagColor: 'gold', difficulty: 9,
        description: 'A deliberate, convincing withdrawal designed to break the enemy\'s formation and discipline. When the enemy pursues a "routing" force, their cohesion collapses. Extremely risky — real routs and feigned ones look identical from outside.',
        historical: 'Battle of Hastings (1066) — Norman cavalry staged repeated feigned retreats, luring Saxon infantry off the hill and breaking the shield-wall.',
        scenario: 'Use against undisciplined enemies when you have high unit cohesion and communication.',
    },
    {
        id: 'deep-ops',
        name: 'Deep Operations',
        primaryGoal: 'Total Systemic Collapse',
        requiredAttribute: 'Logistics',
        tag: 'SYSTEMIC', tagColor: 'obsidian', difficulty: 10,
        description: 'Simultaneous attacks across all depths of the enemy formation — frontline, reserve, command, and supply — to prevent the enemy from stabilizing anywhere in the system.',
        historical: 'Soviet Operation Bagration (1944) — achieved simultaneous penetrations across 1,100km, destroying an entire German Army Group in six weeks.',
        scenario: 'Maximum damage against a structured enemy with coherent logistics. Requires intelligence and multi-vector capability.',
    },
    {
        id: 'defeat-in-detail',
        name: 'Defeat in Detail',
        primaryGoal: 'Overcoming Numbers',
        requiredAttribute: 'Speed',
        tag: 'TEMPO', tagColor: 'gold', difficulty: 8,
        description: 'When outnumbered, use interior lines of movement to concentrate full strength against isolated enemy portions, destroying each before they can concentrate against you. Speed is the only defense.',
        historical: 'Napoleon\'s Italian Campaign (1796) — outnumbered 2:1, he repeatedly concentrated against separate Austrian corps before they could link up.',
        scenario: 'Your force is inferior in total but can achieve local superiority through movement speed.',
    },
    {
        id: 'defense-in-depth',
        name: 'Defense in Depth',
        primaryGoal: 'Exhausting the Enemy',
        requiredAttribute: 'Spatial Awareness',
        tag: 'ATTRITION', tagColor: 'obsidian', difficulty: 6,
        description: 'Multiple successive defensive layers absorb, slow, and bleed an attacking force. Each layer yields ground deliberately, trading space for time and casualties. By the time the attacker reaches the final line, they are exhausted and ripe for counter-attack.',
        historical: 'Soviet defense at Kursk (1943) — 5 defensive belts extending 300km deep absorbed the largest German armored offensive ever launched.',
        scenario: 'When defending with interior advantage and you can afford to yield terrain but not force.',
    },
];

export const EXTENDED_TACTICS = [
    { id: 'empty-fort', name: 'Empty Fort Stratagem', origin: 'Sun Tzu / 36 Stratagems', tag: 'PSYCHOLOGICAL', tagColor: 'gold', difficulty: 10, description: 'When defenseless and a superior force arrives, open the gates and sit calmly in the open. You create a "Reverse Bluff" — the enemy assumes the openness conceals a massive trap and retreats out of fear.', historical: 'Zhuge Liang reportedly used this when Sima Yi\'s army arrived at an undefended city.', scenario: 'Last resort when your position is untenable. Only works if the enemy fears your intellect.' },
    { id: 'deep-maneuver', name: 'Deep Maneuver', origin: 'Israeli Defence Forces', tag: 'TEMPO', tagColor: 'gold', difficulty: 9, description: 'Rather than hitting the enemy\'s side, attack the enemy\'s *future*. Bypass the army entirely to occupy a geographic position they will need in 3 days, paralyzing command.', historical: 'Sinai 1967 and Suez 1973 — IDF bypassed frontline Egyptian units to strike deep administrative rear-area hubs.', scenario: 'When you have superior mobility and intelligence on enemy logistics routes.' },
    { id: 'maskirovka', name: 'Maskirovka', origin: 'Soviet Military Doctrine', tag: 'DECEPTION', tagColor: 'crimson', difficulty: 10, description: 'Total manipulation of the enemy\'s intelligence-gathering process via Reflexive Control — feeding the enemy curated "secret" information so they freely choose the decision you want.', historical: 'Operation Mincemeat (WWII) — British placed fake invasion plans on a dead body, changing German Mediterranean dispositions.', scenario: 'Requires time and information superiority. Devastating when enemy relies on signals intelligence.' },
    { id: 'horns-buffalo', name: 'Horns of the Buffalo', origin: 'Shaka Zulu — Impi', tag: 'ENCIRCLEMENT', tagColor: 'crimson', difficulty: 8, description: 'The "Chest" engages frontally. The "Horns" — hidden fast warriors — sprint around both flanks to close the back. The "Loins" (reserve) sit with backs turned, only committing once horns close.', historical: 'Used by Shaka Zulu\'s impis across southern Africa in the 1820s.', scenario: 'Superior speed vs. less mobile enemy. Requires strong pre-battle positioning.' },
    { id: 'parthian-shot', name: 'The Parthian Shot', origin: 'Parthian / Mongol', tag: 'KITING', tagColor: 'gold', difficulty: 9, description: 'Fast units charge, fire a volley, then panic and flee. As the enemy pursues and breaks formation, the "fleeing" units spin 180° at full gallop and fire directly backward.', historical: 'Battle of Carrhae (53 BC) — Parthians shattered a Roman army through relentless horse-archery kiting.', scenario: 'Your units are faster than the enemy and have ranged capability.' },
    { id: 'strategic-envelopment', name: 'Strategic Envelopment', origin: 'Napoleon Bonaparte', tag: 'LINES OF COMM.', tagColor: 'crimson', difficulty: 9, description: 'March the entire force around the flank to sit on the enemy\'s Line of Communication — supply chain and retreat route. Forces the enemy to turn and fight toward their own capital.', historical: 'Napoleon\'s manœuvre de la ligne d\'opérations repeatedly forced enemies to fight with reversed fronts.', scenario: 'Superior strategic mobility. Works when the enemy is committed to a fixed defensive position.' },
    { id: 'fabian', name: 'Fabian Strategy', origin: 'Quintus Fabius Maximus', tag: 'ATTRITION', tagColor: 'obsidian', difficulty: 5, description: 'Avoid pitched battle entirely. Harass supply lines, cut off foraging parties, shadow the enemy while refusing decisive engagement. Trade time for enemy attrition.', historical: 'Used by Fabius against Hannibal in Italy (217 BC) after Roman armies were annihilated.', scenario: 'Weaker force vs. superior enemy on home terrain. Patience is the primary resource.' },
    { id: 'hammer-anvil', name: 'Hammer and Anvil', origin: 'Classical Warfare', tag: 'COMBINED ARMS', tagColor: 'crimson', difficulty: 7, description: 'One solid force (Anvil) pins the enemy frontally, absorbing their attention. A second mobile force (Hammer) strikes from an unexpected direction.', historical: 'Alexander used phalanxes as anvil, Companion Cavalry as hammer that struck once the enemy was fixed.', scenario: 'Two distinguishable forces — one for holding, one for striking.' },
    { id: 'schwerpunkt', name: 'Schwerpunkt', origin: 'Prussian / German Theory', tag: 'CONCENTRATION', tagColor: 'gold', difficulty: 8, description: 'Identify the enemy\'s critical point of weakness and concentrate overwhelming combat power at that single point. All other units protect flanks and enable the thrust.', historical: 'German Blitzkrieg (1940) — concentrated armor through the "impossible" Ardennes to appear behind the entire Allied defense.', scenario: 'Requires accurate intelligence on where the decisive weak point is.' },
    { id: 'oblique-order', name: 'Oblique Order', origin: 'Frederick the Great', tag: 'CONCENTRATION', tagColor: 'gold', difficulty: 7, description: 'Hold back one wing (refuse it) and concentrate overwhelming force on the opposite wing. One flank destroys the enemy\'s strong wing before the battle even begins.', historical: 'Battle of Leuthen (1757) — Frederick defeated a larger Austrian force by striking with overwhelming numbers on one flank.', scenario: 'When outnumbered but able to achieve local superiority through lateral movement.' },
    { id: 'shock-awe', name: 'Shock and Awe', origin: 'US Military (Ullman & Wade)', tag: 'PSYCHOLOGICAL', tagColor: 'crimson', difficulty: 7, description: 'Overwhelming, rapid, simultaneous application of force to achieve psychological shock, paralyzing the enemy\'s will before they mount a coherent defense.', historical: 'Gulf War opening air campaign (1991) — 39 days of continuous bombardment before a single ground soldier crossed into Kuwait.', scenario: 'You have overwhelming resource superiority and the enemy command structure can be targeted directly.' },
    { id: 'bait-kill', name: 'Bait and Kill Zone', origin: 'Guerrilla / Insurgent', tag: 'AMBUSH', tagColor: 'crimson', difficulty: 8, description: 'A small unit acts as bait to draw a larger enemy force into a pre-prepared kill zone loaded with concealed firepower on multiple sides.', historical: 'Ia Drang Valley (1965) — North Vietnamese repeatedly used bait-and-ambush to draw US forces into terrain of their choosing.', scenario: 'Defend terrain you can select. Requires patience and concealment discipline.' },
    { id: 'guerrilla', name: 'Guerrilla Warfare', origin: 'Iberian War / Mao Zedong', tag: 'ASYMMETRIC', tagColor: 'obsidian', difficulty: 6, description: 'Small, fast units use terrain knowledge to hit concentrated enemy forces at their weakest points, then disperse before retaliation. A thousand cuts, not a killing blow.', historical: 'Mao: "The enemy advances, we retreat. The enemy halts, we harass. The enemy tires, we attack."', scenario: 'Inferior equipment but superior terrain knowledge, speed, and local intelligence.' },
    { id: 'hedgehog', name: 'Hedgehog Defense', origin: 'WWII Defensive Doctrine', tag: 'DEFENSIVE', tagColor: 'obsidian', difficulty: 5, description: 'An all-round defensive position that can be attacked from any direction and repel all of them. Multiple "hedgehog" positions with interlocking fields of fire create an impenetrable web.', historical: 'Alam Halfa (1942) — British defensive boxes in the Western Desert absorbed Rommel\'s final offensive.', scenario: 'When the enemy has breakthrough capability — deny easy exploitation of any penetration.' },
    { id: 'indirect', name: 'Indirect Approach', origin: 'Basil Liddell Hart, 1929', tag: 'MANEUVER', tagColor: 'gold', difficulty: 8, description: 'The least expected route, physical and psychological. Strike at the enemy\'s equilibrium — dislodge them mentally before the decisive blow. A direct attack is the last resort.', historical: 'Liddell Hart analyzed 280 campaigns — in 260, the decisive victory came from an indirect approach.', scenario: 'Almost universally applicable. Used when the enemy expects a frontal engagement.' },
    { id: 'feint-exploit', name: 'Feint and Exploit', origin: 'Operational Maneuver', tag: 'DECEPTION', tagColor: 'gold', difficulty: 8, description: 'A convincing false attack draws the enemy\'s reserves to the wrong location. Once committed and unable to move, the real effort strikes an unprotected position.', historical: 'Operation Fortitude (1944) — fake army under Patton kept German reserves in place for weeks after Normandy.', scenario: 'Enemy has mobile strategic reserves. You need to fix them in the wrong location.' },
    { id: 'flying-column', name: 'Flying Column', origin: '19th Century Imperial', tag: 'TEMPO', tagColor: 'gold', difficulty: 7, description: 'An independent, lightly-equipped, fast-moving force that operates deep behind enemy lines — disrupting communications, striking wherever unprepared, vanishing before response.', historical: 'Boer War — Boer commandos functioning as flying columns humiliated a professional army for years.', scenario: 'Fast, self-sufficient units willing to operate without support for extended periods.' },
    { id: 'cut-off', name: 'Cut-Off and Reduce', origin: 'Siege / Encirclement', tag: 'ENCIRCLEMENT', tagColor: 'crimson', difficulty: 6, description: 'Encircle an enemy force completely — cutting off supply, reinforcement, and retreat — then methodically reduce it at minimum cost. A slow strangling.', historical: 'Battle of Stalingrad (1942-43) — Operation Uranus encircled 300,000 Germans; reduction took 5 months.', scenario: 'You can encircle without an unsustainable perimeter. Enemy relief cannot break through.' },
    { id: 'scorched-earth', name: 'Scorched Earth', origin: 'Universal', tag: 'DENIAL', tagColor: 'obsidian', difficulty: 4, description: 'Systematically destroy everything that could benefit an advancing enemy — crops, bridges, roads, fuel, water. You trade land for a starving, immobilized pursuer.', historical: 'Russia 1812 — Russians burned everything before Napoleon. By the time his army arrived, there was nothing to sustain them.', scenario: 'Forced retreat into your own territory. Last resort — irreversible damage to your own infrastructure.' },
    { id: 'refuse-flank', name: 'Refused Flank', origin: 'Classical / Napoleonic', tag: 'DEFENSIVE', tagColor: 'obsidian', difficulty: 6, description: 'Deliberately hold back one wing of your line — "refusing" it by keeping it angled backward. Creates a natural reserve and a trap: if enemy commits to the refused flank, pivot and envelop them.', historical: 'Used extensively in Napoleonic warfare and by Greek hoplites who refused the right wing while strengthening the left.', scenario: 'You suspect a flanking attack. Want to prevent encirclement while maintaining counter-attack option.' },
    { id: 'phased-withdrawal', name: 'Phased Withdrawal', origin: 'Modern Defensive Doctrine', tag: 'ATTRITION', tagColor: 'obsidian', difficulty: 7, description: 'A fighting retreat conducted in planned stages — each unit leapfrogs backward through the next, which covers withdrawal with fire. Every meter costs the enemy the same price.', historical: 'British Dunkirk rearguards (1940) — successive units held while others withdrew, enabling 340,000 troops to escape.', scenario: 'Prevent a rout. Preserve force when holding is impossible but surrender is unacceptable.' },
    { id: 'rolling-start', name: 'Rolling Start', origin: 'Modern Operational', tag: 'TEMPO', tagColor: 'gold', difficulty: 8, description: 'Attack before full forces are assembled. The purpose is to seize initiative and prevent the enemy from completing their own preparations. Speed is prioritized over mass.', historical: 'Initial US ground attack in Gulf War 1991 — advanced before full logistic tail was ready.', scenario: 'Time-sensitive situation where delay allows the enemy to prepare.' },
    { id: 'peaceful-penetration', name: 'Peaceful Penetration', origin: 'Sub-threshold Warfare', tag: 'SALAMI SLICE', tagColor: 'obsidian', difficulty: 3, description: 'Winning without fighting. Incremental occupation so small each move doesn\'t justify a military response. By the time the enemy realizes they\'ve lost a mile, your position is fortified beyond counterable attack.', historical: 'Chinese expansion in the South China Sea — artificial islands built over years, each step too small to trigger war.', scenario: 'Long time horizon, opponent with high threshold for war, ability to consolidate each gain.' },
];

// ── Difficulty bar ────────────────────────────────────────────────────────────
export const DifficultyBar = ({ level, small = false }) => (
    <div className={`flex items-center gap-0.5 ${small ? '' : ''}`}>
        {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`${small ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full ${i < level
                ? level >= 8 ? 'bg-crimson-600' : level >= 5 ? 'bg-gold-600' : 'bg-obsidian-400'
                : 'bg-obsidian-800'
                }`} />
        ))}
    </div>
);

// ── Tooltip (renders via React portal to escape any overflow clipping) ────────
const FixedTooltip = ({ tactic, anchorRect }) => {
    if (!anchorRect) return null;
    // Position below the card by default; flip up if near bottom
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const tooltipH = 320;
    const top = spaceBelow > tooltipH + 16
        ? anchorRect.bottom + 8
        : anchorRect.top - tooltipH - 8;
    // Center horizontally, clamp to viewport
    const tooltipW = 320;
    let left = anchorRect.left + anchorRect.width / 2 - tooltipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));

    return (
        <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="fixed z-[9999] bg-obsidian-950 border border-obsidian-700 rounded-sm shadow-2xl overflow-hidden pointer-events-none"
            style={{ top, left, width: tooltipW }}
        >
            <div className={`h-0.5 w-full ${tactic.tagColor === 'crimson' ? 'bg-crimson-600' : tactic.tagColor === 'gold' ? 'bg-gold-500' : 'bg-obsidian-600'}`} />
            <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h4 className="font-bold text-obsidian-100 text-sm leading-tight">{tactic.name}</h4>
                        {tactic.origin && <p className="text-[9px] text-obsidian-600 tracking-widest mt-0.5 uppercase">{tactic.origin}</p>}
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[7px] font-bold tracking-wider border rounded-sm ${tactic.tagColor === 'crimson' ? 'border-crimson-800 text-crimson-700' : tactic.tagColor === 'gold' ? 'border-gold-800 text-gold-700' : 'border-obsidian-700 text-obsidian-600'}`}>
                        {tactic.tag}
                    </span>
                </div>
                <div>
                    <p className="text-[9px] text-obsidian-700 tracking-widest uppercase mb-1">Execution Difficulty</p>
                    <DifficultyBar level={tactic.difficulty} />
                </div>
                <p className="text-[11px] text-obsidian-400 leading-relaxed border-t border-obsidian-800 pt-2.5">{tactic.description}</p>
                {tactic.historical && (
                    <div className="bg-obsidian-900/60 border-l-2 border-obsidian-700 pl-3 py-1.5">
                        <p className="text-[9px] text-obsidian-600 leading-relaxed italic">{tactic.historical}</p>
                    </div>
                )}
                {tactic.scenario && (
                    <div className="flex items-start gap-2">
                        <Target className="w-2.5 h-2.5 text-gold-700 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-gold-800 leading-relaxed">{tactic.scenario}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ── Wrapper that tracks anchor rect for tooltip ───────────────────────────────
export const WithTooltip = ({ tactic, children }) => {

    const [hovered, setHovered] = useState(false);
    const [rect, setRect] = useState(null);
    const ref = useRef(null);

    const handleEnter = useCallback(() => {
        if (ref.current) setRect(ref.current.getBoundingClientRect());
        setHovered(true);
    }, []);
    const handleLeave = useCallback(() => setHovered(false), []);

    // Keep rect updated on scroll/resize so tooltip doesn't drift
    useEffect(() => {
        if (!hovered) return;
        const update = () => { if (ref.current) setRect(ref.current.getBoundingClientRect()); };
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
    }, [hovered]);

    return (
        <>
            <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
                {children}
            </div>
            {/* Portal tooltip: rendered to document.body so no parent overflow ever clips it */}
            {typeof document !== 'undefined' && hovered && rect && (
                <AnimatePresence>
                    <FixedTooltip key={tactic.id} tactic={tactic} anchorRect={rect} />
                </AnimatePresence>
            )}
        </>
    );
};

// ── Pinned card (landing page) ────────────────────────────────────────────────
const PinnedCard = memo(({ tactic }) => (
    <WithTooltip tactic={tactic}>
        <motion.div
            whileHover={{ y: -3 }}
            className={`h-full bg-obsidian-950/60 border border-obsidian-800 p-5 rounded-sm cursor-default
                hover:border-obsidian-600 transition-colors duration-200 group select-none`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className={`text-[7px] font-bold tracking-[0.2em] px-1.5 py-0.5 border rounded-sm uppercase
                    ${tactic.tagColor === 'crimson' ? 'border-crimson-900/60 text-crimson-800' : tactic.tagColor === 'gold' ? 'border-gold-900/60 text-gold-800' : 'border-obsidian-800 text-obsidian-600'}`}>
                    {tactic.tag}
                </span>
                <DifficultyBar level={tactic.difficulty} />
            </div>
            <h3 className="font-black text-sm text-obsidian-200 tracking-tight mb-3 group-hover:text-white transition-colors">{tactic.name}</h3>
            <div className="space-y-2 text-[10px]">
                <div className="flex items-start gap-2">
                    <Crosshair className="w-3 h-3 text-obsidian-700 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-obsidian-700 block text-[8px] tracking-[0.15em] uppercase">Primary Goal</span>
                        <span className="text-obsidian-400 font-semibold">{tactic.primaryGoal}</span>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <Shield className="w-3 h-3 text-obsidian-700 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-obsidian-700 block text-[8px] tracking-[0.15em] uppercase">Required Attribute</span>
                        <span className="text-obsidian-400 font-semibold">{tactic.requiredAttribute}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-2.5 h-2.5 text-obsidian-700" />
                <span className="text-[8px] text-obsidian-700 tracking-widest uppercase">Hover for dossier</span>
            </div>
        </motion.div>
    </WithTooltip>
));
PinnedCard.displayName = 'PinnedCard';

// ── Dropdown item ─────────────────────────────────────────────────────────────
const DropdownItem = memo(({ tactic, onSelect }) => (
    <WithTooltip tactic={tactic}>
        <button
            onClick={() => onSelect && onSelect(tactic)}
            className="w-full text-left px-4 py-3 hover:bg-obsidian-800/60 transition-colors border-b border-obsidian-800/40 last:border-0 group"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-bold text-obsidian-300 group-hover:text-white transition-colors truncate">{tactic.name}</p>
                    {tactic.origin && <p className="text-[9px] text-obsidian-700 truncate">{tactic.origin}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[7px] font-bold border px-1.5 py-0.5 rounded-sm whitespace-nowrap
                        ${tactic.tagColor === 'crimson' ? 'border-crimson-900/50 text-crimson-800' : tactic.tagColor === 'gold' ? 'border-gold-900/50 text-gold-800' : 'border-obsidian-800 text-obsidian-600'}`}>
                        {tactic.tag}
                    </span>
                    <DifficultyBar level={tactic.difficulty} small />
                </div>
            </div>
        </button>
    </WithTooltip>
));
DropdownItem.displayName = 'DropdownItem';

// ── See More card (landing) ───────────────────────────────────────────────────
const SeeMoreCard = ({ tactics }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    const filtered = tactics.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tag.toLowerCase().includes(search.toLowerCase()) ||
        (t.origin || '').toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpen(o => !o)}
                className={`w-full min-h-[200px] flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-sm transition-all duration-200 p-5 cursor-pointer
                    ${open ? 'border-gold-700/60 bg-gold-950/10 text-gold-500' : 'border-obsidian-700 bg-obsidian-950/30 text-obsidian-500 hover:border-gold-800/50 hover:text-gold-600'}`}
            >
                <BookOpen className="w-7 h-7" />
                <div className="text-center">
                    <p className="font-bold text-sm uppercase tracking-widest">+ {tactics.length} More Tactics</p>
                    <p className="text-[9px] mt-1 opacity-60 tracking-widest uppercase">From history's greatest commanders</p>
                </div>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-obsidian-950 border border-obsidian-700 rounded-sm shadow-2xl overflow-hidden"
                        style={{ maxHeight: 400 }}
                    >
                        <div className="p-3 border-b border-obsidian-800 bg-obsidian-950">
                            <div className="flex items-center gap-2 px-3 py-2 bg-obsidian-900/60 border border-obsidian-800 rounded-sm">
                                <Search className="w-3.5 h-3.5 text-obsidian-600 shrink-0" />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tactics, tags, origin..." className="flex-1 bg-transparent text-xs text-obsidian-300 placeholder-obsidian-700 outline-none" />
                                {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-obsidian-600 hover:text-obsidian-400" /></button>}
                            </div>
                            <p className="text-[8px] text-obsidian-800 mt-1.5 tracking-widest uppercase text-center">{filtered.length} of {tactics.length} — hover any for dossier</p>
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
                            {filtered.length > 0
                                ? filtered.map(t => <DropdownItem key={t.id} tactic={t} />)
                                : <div className="p-8 text-center text-obsidian-700 text-xs">No tactics match "{search}"</div>
                            }
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main landing page section ─────────────────────────────────────────────────
const TacticsShowcase = () => (
    <section className="py-20 sm:py-28 px-4 border-b border-obsidian-800 bg-obsidian-950/40">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
                <p className="text-[9px] text-gold-700 tracking-[0.3em] uppercase font-mono mb-3">// TACTICAL DOCTRINES</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-obsidian-300 mb-4">KNOWN TACTICS</h2>
                <p className="text-sm text-obsidian-600 max-w-xl mx-auto leading-relaxed">
                    The battlefield rewards commanders who understand doctrine. Hover any card for the full operational dossier.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {PINNED_TACTICS.map((tactic, i) => (
                    <motion.div key={tactic.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                        <PinnedCard tactic={tactic} />
                    </motion.div>
                ))}
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: PINNED_TACTICS.length * 0.07 }}>
                    <SeeMoreCard tactics={EXTENDED_TACTICS} />
                </motion.div>
            </div>
        </div>
    </section>
);

export default TacticsShowcase;
