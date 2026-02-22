import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, BookOpen, Search, X, Zap, Target, Shield, Eye, Clock, Crosshair } from 'lucide-react';

// ── Tactic data ──────────────────────────────────────────────────────────────

// Shown as pinned visible cards (the 5 from the original table)
export const PINNED_TACTICS = [
    {
        id: 'pincer',
        name: 'Pincer Movement',
        primaryGoal: 'Physical Annihilation',
        requiredAttribute: 'Discipline & Timing',
        tag: 'ENCIRCLEMENT',
        tagColor: 'crimson',
        difficulty: 7,
        description:
            'Two forces converge simultaneously on both flanks of an enemy position, trapping them in a lethal vice. The enemy cannot reinforce one side without exposing the other. Success depends entirely on synchronized timing — a botched pincer becomes a double-flank of your own.',
        historical: 'Battle of Cannae (216 BC) — Hannibal annihilated a Roman army twice his size with a perfect double-envelopment, killing ~50,000 in a single afternoon.',
        scenario: 'Use when enemy is stationary and you have two independent mobile forces.',
    },
    {
        id: 'feigned-retreat',
        name: 'Feigned Retreat',
        primaryGoal: 'Breaking Formation',
        requiredAttribute: 'Deception',
        tag: 'PSYCHOLOGICAL',
        tagColor: 'gold',
        difficulty: 9,
        description:
            'A deliberate, convincing withdrawal designed to break the enemy\'s formation and discipline. When the enemy pursues a "routing" force, their cohesion collapses. The retreating force then pivots and destroys a now-disorganized pursuer. Extremely risky — real routes and feigned ones look identical from the outside.',
        historical: 'Battle of Hastings (1066) — The Norman cavalry staged repeated feigned retreats, luring Saxon infantry off the hill and breaking the shield-wall.',
        scenario: 'Use against undisciplined enemies when you have high unit cohesion and communication.',
    },
    {
        id: 'deep-ops',
        name: 'Deep Operations',
        primaryGoal: 'Total Systemic Collapse',
        requiredAttribute: 'Logistics',
        tag: 'SYSTEMIC',
        tagColor: 'obsidian',
        difficulty: 10,
        description:
            'Simultaneous attacks across all depths of the enemy formation — frontline, reserve, command, and supply — to prevent the enemy from stabilizing anywhere in the system. Rather than winning one engagement, you collapse the entire command hierarchy at once.',
        historical: 'Soviet Operation Bagration (1944) — achieved simultaneous penetrations across a 1,100km front, destroying an entire German Army Group in six weeks.',
        scenario: 'Maximum damage against a structured enemy with coherent logistics. Requires intelligence and multi-vector capability.',
    },
    {
        id: 'defeat-in-detail',
        name: 'Defeat in Detail',
        primaryGoal: 'Overcoming Numbers',
        requiredAttribute: 'Speed',
        tag: 'TEMPO',
        tagColor: 'gold',
        difficulty: 8,
        description:
            'When outnumbered, you use interior lines of movement to concentrate your full strength against isolated portions of the enemy, destroying each segment before they can concentrate against you. Speed is the only defense — the enemy must not have time to reunify.',
        historical: 'Napoleon\'s Italian Campaign (1796) — outnumbered 2:1, he repeatedly concentrated against separate Austrian corps before they could link up.',
        scenario: 'Your force is inferior in total but can achieve local superiority at chosen points through movement speed.',
    },
    {
        id: 'defense-in-depth',
        name: 'Defense in Depth',
        primaryGoal: 'Exhausting the Enemy',
        requiredAttribute: 'Spatial Awareness',
        tag: 'ATTRITION',
        tagColor: 'obsidian',
        difficulty: 6,
        description:
            'Multiple successive defensive layers that absorb, slow, and bleed an attacking force. Each layer yields ground deliberately, trading space for time and casualties. By the time the attacker reaches the final line, they are exhausted, over-extended, and ripe for a counter-offensive.',
        historical: 'Soviet defense at Kursk (1943) — 5 defensive belts extending 300km deep absorbed the largest German armored offensive ever launched.',
        scenario: 'When defending with interior advantage and you can afford to yield terrain but not force.',
    },
];

// Extended tactics available in the dropdown
export const EXTENDED_TACTICS = [
    {
        id: 'empty-fort',
        name: 'Empty Fort Stratagem',
        origin: 'Sun Tzu / 36 Stratagems',
        tag: 'PSYCHOLOGICAL',
        tagColor: 'gold',
        difficulty: 10,
        description:
            'When defenseless and a superior force arrives, open the gates, sweep the floors, and sit calmly on the walls playing music. You create a "Reverse Bluff" — the enemy assumes the openness conceals a massive trap. They retreat out of fear of your supposed hidden strength.',
        historical: 'Zhuge Liang reportedly used this when Sima Yi\'s army arrived at an undefended city. The genius was understanding his enemy\'s psychology of his own intellect.',
        scenario: 'Last resort when your position is untenable. Only works if the enemy respects and fears your intelligence.',
    },
    {
        id: 'deep-maneuver',
        name: 'Deep Maneuver',
        origin: 'Israeli Defence Forces',
        tag: 'TEMPO',
        tagColor: 'gold',
        difficulty: 9,
        description:
            'Rather than hitting the enemy\'s side, you attack the enemy\'s *future*. Bypass the army entirely to occupy a geographic position they will critically need in 3 days. By winning terrain before the enemy realizes its importance, you paralyze their command.',
        historical: 'Sinai 1967 and Suez 1973 — the IDF bypassed frontline Egyptian units to strike deep administrative rear-area hubs, collapsing logistics before fighting the main battle.',
        scenario: 'When you have superior mobility and intelligence on enemy logistics routes.',
    },
    {
        id: 'maskirovka',
        name: 'Maskirovka',
        origin: 'Soviet Military Doctrine',
        tag: 'DECEPTION',
        tagColor: 'crimson',
        difficulty: 10,
        description:
            'Total manipulation of the enemy\'s intelligence-gathering process via Reflexive Control — feeding the enemy specifically curated "secret" information so they freely choose the decision you want them to make. Not just a fake position; a fabricated reality.',
        historical: 'Operation Mincemeat (WWII) — British placed fake invasion plans on a dead body dressed as an officer, letting it wash ashore in Spain. German intelligence changed Mediterranean dispositions based on it.',
        scenario: 'Requires time and information superiority. Devastating when enemy relies on signals intelligence.',
    },
    {
        id: 'horns-buffalo',
        name: 'Horns of the Buffalo',
        origin: 'Shaka Zulu — Zulu Impi',
        tag: 'ENCIRCLEMENT',
        tagColor: 'crimson',
        difficulty: 8,
        description:
            'A 3-element encirclement: The "Chest" engages frontally and fixes the enemy. The "Horns" — two hidden wings of fast warriors — sprint around both flanks to close the back. The "Loins" (reserve) sit with their backs to the battle so they don\'t over-commit, turning only when the horns close to finish.',
        historical: 'Used by Shaka Zulu\'s impis across southern Africa in the 1820s. The fluidity and speed of the horns made it nearly impossible to counter in the open field.',
        scenario: 'Superior speed vs. less mobile enemy. Requires strong unit cohesion and pre-battle positioning.',
    },
    {
        id: 'parthian-shot',
        name: 'The Parthian Shot',
        origin: 'Parthian / Mongol Horse Archery',
        tag: 'KITING',
        tagColor: 'gold',
        difficulty: 9,
        description:
            'Fast mobile units charge, fire a volley, then panic and flee. As the enemy pursues and breaks their formation, the "fleeing" units spin 180° at full gallop and fire directly backward. The complexity: maintain a consistent speed — close enough to tempt, too far to strike.',
        historical: 'Used to devastating effect against Roman heavy infantry (Battle of Carrhae, 53 BC) and later by Mongol cavalry who refined horse-archery kiting to a science.',
        scenario: 'Your units are faster than the enemy and have ranged capability. Enemy is pursuit-prone and undisciplined.',
    },
    {
        id: 'strategic-envelopment',
        name: 'Strategic Envelopment',
        origin: 'Napoleon Bonaparte',
        tag: 'LINES OF COMMUNICATION',
        tagColor: 'crimson',
        difficulty: 9,
        description:
            'Rather than attacking the enemy army directly, march the entire force around the flank to sit on the enemy\'s Line of Communication — their supply chain and retreat route. This forces the enemy to turn and fight toward their own capital. If they lose, there is no retreat and annihilation is total.',
        historical: 'Napoleon\'s campaigns repeatedly used this manœuvre de la ligne d\'opérations, forcing enemies to fight with reversed fronts.',
        scenario: 'Superior strategic mobility. Works best when the enemy is committed to a fixed defensive position.',
    },
    {
        id: 'fabian',
        name: 'Fabian Strategy',
        origin: 'Quintus Fabius Maximus, Rome',
        tag: 'ATTRITION',
        tagColor: 'obsidian',
        difficulty: 5,
        description:
            'Avoid pitched battle entirely. Instead, harass supply lines, cut off foraging parties, and shadow the enemy while refusing decisive engagement. The strategy trades time for enemy attrition — the invader slowly starves, loses morale, and eventually weakens enough to be destroyed.',
        historical: 'Used by Fabius against Hannibal in Italy (217 BC) after Roman armies were annihilated. Politically unpopular but strategically sound — it worked until Cannae forced the debate.',
        scenario: 'Weaker force vs. superior enemy on home terrain. Patience is the primary resource.',
    },
    {
        id: 'hammer-anvil',
        name: 'Hammer and Anvil',
        origin: 'Classical Warfare',
        tag: 'COMBINED ARMS',
        tagColor: 'crimson',
        difficulty: 7,
        description:
            'One solid force (the Anvil) pins the enemy frontally, absorbing their attention and preventing withdrawal. A second mobile force (the Hammer) then strikes from an unexpected direction. The key: the Anvil must be strong enough to hold without the Hammer\'s support.',
        historical: 'Alexander the Great used this repeatedly — phalanxes as the anvil, Companion Cavalry as the hammer that struck the vulnerable flank once the enemy was fixed.',
        scenario: 'Two distinguishable forces — one suited for holding, one for striking. Enemy must be containable frontally.',
    },
    {
        id: 'schwerpunkt',
        name: 'Schwerpunkt',
        origin: 'Prussian / German Military Theory',
        tag: 'CONCENTRATION',
        tagColor: 'gold',
        difficulty: 8,
        description:
            'The "Center of Gravity" doctrine — identify the enemy\'s critical point of weakness and concentrate overwhelming combat power at that single point to achieve a decisive breakthrough. All other units exist to protect the flanks and enable the Schwerpunkt thrust.',
        historical: 'German Blitzkrieg (1940) — concentrated armor through the Ardennes (the "impossible" terrain) to bypass the entire Allied defense and appear behind them.',
        scenario: 'Requires accurate intelligence on where the decisive weak point is. A mistaken Schwerpunkt wastes everything.',
    },
    {
        id: 'oblique-order',
        name: 'Oblique Order',
        origin: 'Frederick the Great of Prussia',
        tag: 'CONCENTRATION',
        tagColor: 'gold',
        difficulty: 7,
        description:
            'Rather than attacking all along the front simultaneously, hold back one wing (or refuse it) and concentrate overwhelming force on the opposite wing. One flank destroys the enemy\'s strong wing before the battle even begins, then rolls down the line.',
        historical: 'Battle of Leuthen (1757) — Frederick defeated a larger Austrian force by striking with overwhelming numbers on one flank while a screen of cavalry masked the movement.',
        scenario: 'When outnumbered but able to achieve local superiority through lateral movement.',
    },
    {
        id: 'shock-awe',
        name: 'Shock and Awe',
        origin: 'US Military Doctrine (Ullman & Wade, 1996)',
        tag: 'PSYCHOLOGICAL',
        tagColor: 'crimson',
        difficulty: 7,
        description:
            'Overwhelming, rapid, and simultaneous application of force across all domains to achieve "Rapid Dominance" — a psychological shock that paralyzes the enemy\'s will and decision-making before they can mount a coherent defense. Volume and velocity are the weapons, not precision.',
        historical: 'Gulf War opening air campaign (1991) — 39 days of continuous bombardment before a single ground soldier crossed into Kuwait.',
        scenario: 'You have overwhelming resource superiority and the enemy command structure can be targeted directly.',
    },
    {
        id: 'bait-kill-zone',
        name: 'Bait and Kill Zone',
        origin: 'Guerrilla / Insurgent Warfare',
        tag: 'AMBUSH',
        tagColor: 'crimson',
        difficulty: 8,
        description:
            'A small unit (or sacrificial position) acts as bait to draw a larger enemy force into a pre-prepared kill zone — a terrain feature laden with concealed firepower on multiple sides. The bait must be credible enough that the enemy commits before realizing the trap.',
        historical: 'Ia Drang Valley (1965) — North Vietnamese regulars repeatedly used bait-and-ambush tactics to draw US forces into terrain of their choosing.',
        scenario: 'Defend terrain you can select. Requires patience and concealment discipline.',
    },
    {
        id: 'guerrilla',
        name: 'Guerrilla Warfare',
        origin: 'Iberian Peninsular War / Mao Zedong',
        tag: 'ASYMMETRIC',
        tagColor: 'obsidian',
        difficulty: 6,
        description:
            'Small, fast, lightly-armed units use terrain knowledge and local support to hit concentrated enemy forces at their weakest points, then disperse before retaliation. The goal is a thousand cuts, not a killing blow. You never occupy terrain — you inhabit it.',
        historical: 'Chinese Civil War and Vietnam — Mao\'s dictum: "The enemy advances, we retreat. The enemy halts, we harass. The enemy tires, we attack. The enemy retreats, we pursue."',
        scenario: 'Your force is inferior in equipment but superior in terrain knowledge, speed, and local intelligence.',
    },
    {
        id: 'hedgehog',
        name: 'Hedgehog Defense',
        origin: 'WWII Defensive Doctrine',
        tag: 'DEFENSIVE',
        tagColor: 'obsidian',
        difficulty: 5,
        description:
            'An all-round defensive position — a strong point that can be attacked from any direction and repel all of them. Rather than a linear front, multiple "hedgehog" positions with interlocking fields of fire create a web. Even if bypassed, each position continues to fight.',
        historical: 'Alam Halfa (1942) — British defensive boxes in the Western Desert absorbed Rommel\'s final offensive and ground it to a halt despite superior German armor.',
        scenario: 'When the enemy has breakthrough capability — you want to deny easy exploitation of any penetration.',
    },
    {
        id: 'indirect-approach',
        name: 'Indirect Approach',
        origin: 'Basil Liddell Hart, 1929',
        tag: 'MANEUVER THEORY',
        tagColor: 'gold',
        difficulty: 8,
        description:
            'The least expected route, both physical and psychological. Instead of striking at strength (which produces maximum resistance), strike at the enemy\'s equilibrium — dislodge them mentally and physically before the decisive blow. A direct attack is the last resort.',
        historical: 'Liddell Hart analyzed 280 campaigns across 30 wars — in 260 cases, the decisive victory came from an indirect approach. He called direct attack "unadulterated stupidity."',
        scenario: 'Almost universally applicable. Used when the enemy expects a frontal engagement.',
    },
    {
        id: 'feint-exploit',
        name: 'Feint and Exploit',
        origin: 'Operational Maneuver',
        tag: 'DECEPTION',
        tagColor: 'gold',
        difficulty: 8,
        description:
            'A convincing false attack draws the enemy\'s reserves to the wrong location. Once the reserves are committed and cannot be moved, the real main effort strikes an now-unprotected position. Timing is critical — the exploitation force must strike before reserves can be recalled.',
        historical: 'Operation Overlord (1944) — Operation Fortitude (the fake army led by Patton) convinced Hitler the Normandy landings were a feint, keeping German reserves in place for critical weeks.',
        scenario: 'Enemy has mobile strategic reserves. You need to fix them in the wrong location.',
    },
    {
        id: 'flying-column',
        name: 'Flying Column',
        origin: '19th Century Imperial Warfare',
        tag: 'TEMPO',
        tagColor: 'gold',
        difficulty: 7,
        description:
            'An independent, lightly-equipped, fast-moving force that operates deep behind enemy lines — disrupting communications, destroying supply depots, striking wherever the enemy is unprepared, and vanishing before a response can be mounted. No fixed objective; maximum disruption.',
        historical: 'British Boer War — the ability of Boer commandos to function as flying columns humiliated a professional army for years.',
        scenario: 'You have fast, self-sufficient units willing to operate without support for extended periods.',
    },
    {
        id: 'cut-off-reduce',
        name: 'Cut-Off and Reduce',
        origin: 'Siege / Encirclement Warfare',
        tag: 'ENCIRCLEMENT',
        tagColor: 'crimson',
        difficulty: 6,
        description:
            'Encircle an enemy force completely — cutting off all supply, reinforcement, and retreat — then methodically reduce it at minimum cost. Not a rapid battle but a slow strangling. The enclosed force must either surrender, break out under fire, or be annihilated.',
        historical: 'Battle of Stalingrad (1942-43) — Operation Uranus encircled German 6th Army; subsequent reduction took 5 months and destroyed 300,000 troops.',
        scenario: 'You can encircle without creating an unsustainable perimeter. Enemy relief cannot break through.',
    },
    {
        id: 'rolling-start',
        name: 'Rolling Start',
        origin: 'Modern Operational Planning',
        tag: 'TEMPO',
        tagColor: 'gold',
        difficulty: 8,
        description:
            'Attack before full forces are assembled or fully prepared. The purpose is to seize the initiative and prevent the enemy from completing their own preparations. Speed is prioritized over mass — even with partial forces, disrupting the enemy\'s timetable is worth the risk.',
        historical: 'Initial US ground attack in Gulf War 1991 — advanced before full logistic tail was ready, betting correctly that Iraqi force collapse would outrun supply problems.',
        scenario: 'Time-sensitive situation where delay allows the enemy to prepare. You have enough to disrupt even without full strength.',
    },
    {
        id: 'scorched-earth',
        name: 'Scorched Earth',
        origin: 'Universal — recorded in every major civilization',
        tag: 'DENIAL',
        tagColor: 'obsidian',
        difficulty: 4,
        description:
            'Systematically destroy everything that could benefit an advancing enemy — crops, bridges, roads, fuel depots, water supplies, and civilian infrastructure. You trade the land for a starving, immobilized pursuer. The cost is borne by your own territory and population.',
        historical: 'Russia 1812 — as Napoleon advanced toward Moscow, the Russians burned everything. By the time the Grand Armée arrived, there was nothing to sustain them. The retreat destroyed the army.',
        scenario: 'Forced retreat into your own territory. Last resort — irreversible damage to your own infrastructure.',
    },
    {
        id: 'refuse-flank',
        name: 'Refused Flank',
        origin: 'Classical / Napoleonic Tactics',
        tag: 'DEFENSIVE',
        tagColor: 'obsidian',
        difficulty: 6,
        description:
            'Deliberately hold back one wing of your line — "refusing" it by keeping it angled backward. This prevents the wing from being enveloped, creates a natural reserve, and if the enemy commits to the refused flank, your strong wing can pivot and envelop them in return. A trap set by apparent weakness.',
        historical: 'Used extensively in Napoleonic warfare and earlier by Greek hoplites who refused the right wing while strengthening the left.',
        scenario: 'You suspect a flanking attack. You want to prevent encirclement while maintaining the option to counter-attack.',
    },
    {
        id: 'phased-withdrawal',
        name: 'Phased Withdrawal',
        origin: 'Modern Defensive Doctrine',
        tag: 'ATTRITION',
        tagColor: 'obsidian',
        difficulty: 7,
        description:
            'A fighting retreat conducted in planned stages — each unit leapfrogs backward through the next, which covers the withdrawal with fire. The enemy is forced to fight for every meter at the same cost, while your forces preserve themselves and choose when to stand and fight.',
        historical: 'British Dunkirk rearguards (1940) — successive units held while others withdrew, enabling 340,000 troops to escape through a corridor that was systematically compressed.',
        scenario: 'Prevent a rout. Preserve force when holding is impossible but surrender is unacceptable.',
    },
    {
        id: 'peaceful-penetration',
        name: 'Peaceful Penetration',
        origin: 'Geopolitical / Sub-threshold Warfare',
        tag: 'SALAMI SLICE',
        tagColor: 'obsidian',
        difficulty: 3,
        description:
            'Winning without fighting. Incremental occupation of territory so small each individual move doesn\'t justify a military response. "Salami Slicing" — you take one yard today, another tomorrow. By the time the enemy realizes they\'ve lost a mile, your position is fortified beyond counterable assault.',
        historical: 'Chinese expansion in the South China Sea — artificial islands built over years, each step too small to trigger war, combined creating an air-defense and naval projection zone.',
        scenario: 'Long time horizon, opponent with a high threshold for declaring war, and ability to consolidate each gain.',
    },
];

// ── Difficulty stars ──────────────────────────────────────────────────────────
const DifficultyBar = ({ level }) => (
    <div className="flex items-center gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
            <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i < level ? (level >= 8 ? 'bg-crimson-600' : level >= 6 ? 'bg-gold-600' : 'bg-obsidian-500') : 'bg-obsidian-800'}`}
            />
        ))}
    </div>
);

// ── Shared hover tooltip (tactical dossier) ───────────────────────────────────
const TacticTooltip = ({ tactic, position = 'top' }) => (
    <motion.div
        initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 w-72 sm:w-80 bg-obsidian-950 border border-obsidian-700 rounded-sm shadow-2xl overflow-hidden pointer-events-none"
        style={position === 'top' ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } : { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }}
    >
        {/* Header accent */}
        <div className={`h-0.5 w-full ${tactic.tagColor === 'crimson' ? 'bg-crimson-600' : tactic.tagColor === 'gold' ? 'bg-gold-500' : 'bg-obsidian-600'}`} />
        <div className="p-4 space-y-3">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h4 className="font-bold text-obsidian-200 text-sm leading-tight">{tactic.name}</h4>
                    {tactic.origin && (
                        <p className="text-[9px] text-obsidian-600 tracking-widest mt-0.5 uppercase">{tactic.origin}</p>
                    )}
                </div>
                <span className={`shrink-0 px-1.5 py-0.5 text-[7px] font-bold tracking-wider border rounded-sm
                    ${tactic.tagColor === 'crimson' ? 'border-crimson-800 text-crimson-700' :
                        tactic.tagColor === 'gold' ? 'border-gold-800 text-gold-700' :
                            'border-obsidian-700 text-obsidian-600'}`}>
                    {tactic.tag}
                </span>
            </div>

            {/* Difficulty */}
            {tactic.difficulty && (
                <div>
                    <p className="text-[9px] text-obsidian-700 tracking-widest uppercase mb-1">Execution Difficulty</p>
                    <DifficultyBar level={tactic.difficulty} />
                </div>
            )}

            {/* Description */}
            <p className="text-[11px] text-obsidian-400 leading-relaxed border-t border-obsidian-800 pt-3">{tactic.description}</p>

            {/* Historical */}
            {tactic.historical && (
                <div className="bg-obsidian-900/60 border-l-2 border-obsidian-700 pl-3 py-1.5 rounded-r-sm">
                    <p className="text-[9px] text-obsidian-600 leading-relaxed italic">{tactic.historical}</p>
                </div>
            )}

            {/* Scenario */}
            {tactic.scenario && (
                <div className="flex items-start gap-2">
                    <Target className="w-3 h-3 text-gold-700 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-gold-800 leading-relaxed">{tactic.scenario}</p>
                </div>
            )}
        </div>
        {/* Scanline */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, transparent 1px, transparent 3px)' }} />
    </motion.div>
);

// ── Pinned visible card ───────────────────────────────────────────────────────
const PinnedCard = ({ tactic }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="relative group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <motion.div
                whileHover={{ y: -3 }}
                className={`h-full bg-obsidian-950/60 border border-obsidian-800 p-5 rounded-sm cursor-default transition-colors duration-200
                    ${hovered
                        ? tactic.tagColor === 'crimson' ? 'border-crimson-800/70 bg-crimson-950/20'
                            : tactic.tagColor === 'gold' ? 'border-gold-800/70 bg-gold-950/10'
                                : 'border-obsidian-700'
                        : ''}`}
            >
                {/* Tag */}
                <div className="flex items-center justify-between mb-3">
                    <span className={`text-[7px] font-bold tracking-[0.2em] px-1.5 py-0.5 border rounded-sm uppercase
                        ${tactic.tagColor === 'crimson' ? 'border-crimson-900/60 text-crimson-800'
                            : tactic.tagColor === 'gold' ? 'border-gold-900/60 text-gold-800'
                                : 'border-obsidian-800 text-obsidian-600'}`}>
                        {tactic.tag}
                    </span>
                    <DifficultyBar level={tactic.difficulty} />
                </div>

                {/* Name */}
                <h3 className="font-black text-sm text-obsidian-200 tracking-tight mb-3 group-hover:text-white transition-colors">
                    {tactic.name}
                </h3>

                {/* Table data */}
                <div className="space-y-2 text-[10px]">
                    <div className="flex items-start gap-2">
                        <Crosshair className="w-3 h-3 text-obsidian-700 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-obsidian-700 block" style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Primary Goal</span>
                            <span className="text-obsidian-400 font-semibold">{tactic.primaryGoal}</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Shield className="w-3 h-3 text-obsidian-700 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-obsidian-700 block" style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Required Attribute</span>
                            <span className="text-obsidian-400 font-semibold">{tactic.requiredAttribute}</span>
                        </div>
                    </div>
                </div>

                {/* Hover indicator */}
                <div className="flex items-center gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-2.5 h-2.5 text-obsidian-700" />
                    <span className="text-[8px] text-obsidian-700 tracking-widest uppercase">Hover for dossier</span>
                </div>
            </motion.div>

            {/* Tooltip */}
            <AnimatePresence>
                {hovered && <TacticTooltip tactic={tactic} position="top" />}
            </AnimatePresence>
        </div>
    );
};

// ── Dropdown item ─────────────────────────────────────────────────────────────
const DropdownItem = ({ tactic, onClick }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="relative"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <button
                onClick={() => onClick && onClick(tactic)}
                className="w-full text-left px-4 py-3 hover:bg-obsidian-800/60 transition-colors border-b border-obsidian-800/50 last:border-0 group"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-obsidian-300 group-hover:text-white transition-colors truncate">{tactic.name}</p>
                        {tactic.origin && (
                            <p className="text-[9px] text-obsidian-700 truncate">{tactic.origin}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[7px] font-bold border px-1.5 py-0.5 rounded-sm whitespace-nowrap
                            ${tactic.tagColor === 'crimson' ? 'border-crimson-900/50 text-crimson-800'
                                : tactic.tagColor === 'gold' ? 'border-gold-900/50 text-gold-800'
                                    : 'border-obsidian-800 text-obsidian-600'}`}>
                            {tactic.tag}
                        </span>
                        <DifficultyBar level={tactic.difficulty} />
                    </div>
                </div>
            </button>
            <AnimatePresence>
                {hovered && <TacticTooltip tactic={tactic} position="bottom" />}
            </AnimatePresence>
        </div>
    );
};

// ── See More Card ─────────────────────────────────────────────────────────────
const SeeMoreCard = ({ tactics }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    const filtered = tactics.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tag.toLowerCase().includes(search.toLowerCase()) ||
        (t.origin || '').toLowerCase().includes(search.toLowerCase())
    );

    // Close on outside click
    useEffect(() => {
        const handler = e => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative h-full" ref={dropdownRef}>
            <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpen(o => !o)}
                className={`w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-sm transition-all duration-200 p-5
                    ${open
                        ? 'border-gold-700/60 bg-gold-950/10 text-gold-500'
                        : 'border-obsidian-700 bg-obsidian-950/30 text-obsidian-500 hover:border-gold-800/50 hover:text-gold-600'}`}
            >
                <BookOpen className="w-8 h-8" />
                <div className="text-center">
                    <p className="font-bold text-sm uppercase tracking-widest">+ {tactics.length} More Tactics</p>
                    <p className="text-[9px] mt-1 opacity-70 tracking-widest uppercase">From history's greatest commanders</p>
                </div>
                {open
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                }
            </motion.button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-50 bg-obsidian-950 border border-obsidian-700 rounded-sm shadow-2xl overflow-hidden"
                        style={{ maxHeight: '420px' }}
                    >
                        {/* Search */}
                        <div className="p-3 border-b border-obsidian-800 sticky top-0 bg-obsidian-950 z-10">
                            <div className="flex items-center gap-2 px-3 py-2 bg-obsidian-900/60 border border-obsidian-800 rounded-sm">
                                <Search className="w-3.5 h-3.5 text-obsidian-600 shrink-0" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search tactics, tags, origin..."
                                    className="flex-1 bg-transparent text-xs text-obsidian-300 placeholder-obsidian-700 outline-none"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')}>
                                        <X className="w-3 h-3 text-obsidian-600 hover:text-obsidian-400" />
                                    </button>
                                )}
                            </div>
                            <p className="text-[8px] text-obsidian-800 mt-1.5 tracking-widest uppercase text-center">
                                {filtered.length} of {tactics.length} tactics — hover any for dossier
                            </p>
                        </div>

                        {/* Items */}
                        <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                            {filtered.length > 0 ? (
                                filtered.map(t => <DropdownItem key={t.id} tactic={t} />)
                            ) : (
                                <div className="p-8 text-center text-obsidian-700 text-xs">No tactics match "{search}"</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main export: Tactics Showcase section ─────────────────────────────────────
const TacticsShowcase = () => (
    <section className="py-20 sm:py-28 px-4 border-b border-obsidian-800 bg-obsidian-950/40">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
                <p className="text-[9px] text-gold-700 tracking-[0.3em] uppercase font-mono mb-3">// TACTICAL DOCTRINES</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-obsidian-300 mb-4">KNOWN TACTICS</h2>
                <p className="text-sm text-obsidian-600 max-w-xl mx-auto leading-relaxed">
                    The battlefield rewards commanders who understand doctrine. These tactics have shaped history.
                    Hover any card for the full operational dossier.
                </p>
            </div>

            {/* Grid: 5 pinned cards + 1 see-more card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {PINNED_TACTICS.map((tactic, i) => (
                    <motion.div
                        key={tactic.id}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07 }}
                    >
                        <PinnedCard tactic={tactic} />
                    </motion.div>
                ))}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: PINNED_TACTICS.length * 0.07 }}
                >
                    <SeeMoreCard tactics={EXTENDED_TACTICS} />
                </motion.div>
            </div>
        </div>
    </section>
);

export default TacticsShowcase;
