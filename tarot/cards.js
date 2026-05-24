// Major Arcana card data, adapted from the esoterica tarot framework
// https://github.com/Temple-of-Silicon/esoterica
const MAJOR_ARCANA = [
  {
    number: 0,
    name: "The Fool",
    themes: "New beginnings, innocent faith, the leap into the unknown, pure potential",
    situations: "Starting something new, stepping into uncertainty, trusting the journey, embracing beginner's mind, taking a risk without all the answers",
    shadows: "Recklessness, naivety, ignoring practical concerns, foolishness disguised as faith, lack of preparation",
    symbols: "Cliff edge (threshold moment), white rose (purity of intention), small dog (instinct and loyal companionship), bundle on stick (carrying only what you need), mountains ahead (journey to come)",
    glyph: "0"
  },
  {
    number: 1,
    name: "The Magician",
    themes: "Manifestation, skill, having all the tools you need, conscious creation, channeling power",
    situations: "Beginning a project with confidence, using your skills intentionally, recognizing you have what it takes, connecting vision to action, commanding resources",
    shadows: "Manipulation, using skills for selfish ends, trickery, scattered energy, knowing how but lacking why",
    symbols: "Infinity symbol above head (unlimited potential), wand raised (directing energy), four suit symbols on table (all tools present), red and white robes (passion and purity), blooming garden (fertile ground)",
    glyph: "I"
  },
  {
    number: 2,
    name: "The High Priestess",
    themes: "Intuition, hidden knowledge, the unconscious, mystery, receptivity, inner wisdom",
    situations: "Trusting your gut over logic, waiting for more information to surface, listening to what isn't being said, honoring mystery, accessing deeper knowing",
    shadows: "Secrets kept destructively, hiding from action behind \"intuition\", disconnection from practical reality, passive withdrawal",
    symbols: "Veil behind her (mystery and hidden knowledge), crescent moon at feet (intuition and cycles), pillars (threshold between known and unknown), scroll labeled TORA (hidden teachings), pomegranates (feminine wisdom)",
    glyph: "II"
  },
  {
    number: 3,
    name: "The Empress",
    themes: "Abundance, nurturing, creativity, fertility, sensory experience, growth, mothering energy",
    situations: "Creating something that grows, nurturing a project or relationship, trusting in natural abundance, engaging the senses, being in the body",
    shadows: "Overindulgence, creative blocks disguised as waiting, smothering care, dependence on external validation, neglecting practical needs",
    symbols: "Wheat field (abundance and harvest), flowing water (emotions and flow), Venus symbol on heart shield (love and creation), crown of stars (connection to cosmos), lush nature (fertility)",
    glyph: "III"
  },
  {
    number: 4,
    name: "The Emperor",
    themes: "Structure, authority, leadership, discipline, foundations, rational order, protection through boundaries",
    situations: "Building systems, establishing boundaries, taking charge, providing structure, making executive decisions, creating stability through order",
    shadows: "Tyranny, rigidity, control for control's sake, inability to adapt, authoritarian force, cold rationality divorced from feeling",
    symbols: "Stone throne (solid foundation), ram heads (Aries energy and assertion), armor under robes (protection and readiness), barren mountains (masculine starkness), orb and scepter (worldly power)",
    glyph: "IV"
  },
  {
    number: 5,
    name: "The Hierophant",
    themes: "Tradition, teaching, spiritual authority, conformity to established wisdom, mentorship, sacred institutions",
    situations: "Learning from established sources, following a proven path, seeking guidance from teachers, honoring tradition, finding community in shared beliefs",
    shadows: "Dogma, rigid adherence to rules, suppression of individual truth, appealing to authority over direct experience, spiritual gatekeeping",
    symbols: "Triple crown (spiritual authority), crossed keys (access to mysteries), two acolytes (teacher and students), religious setting (institutional knowledge), blessing gesture (transmission of wisdom)",
    glyph: "V"
  },
  {
    number: 6,
    name: "The Lovers",
    themes: "Choice, union, values alignment, relationship, integration of opposites, conscious commitment",
    situations: "Making a significant choice, aligning with your values, forming partnerships, integrating different aspects of self, choosing between paths",
    shadows: "Codependency, avoiding choice, values conflict, temptation that misaligns with truth, losing self in relationship",
    symbols: "Angel above (divine blessing or higher perspective), naked figures (vulnerability and authenticity), tree of knowledge and tree of life (choice and consequence), mountain (higher calling), serpent (temptation or wisdom)",
    glyph: "VI"
  },
  {
    number: 7,
    name: "The Chariot",
    themes: "Willpower, determination, victory through focus, controlled energy, movement forward, assertion",
    situations: "Pushing through obstacles, maintaining focus amid distractions, harnessing opposing forces, achieving through discipline, moving forward with determination",
    shadows: "Aggression, forcing outcomes, running over others, rigid control, winning at all costs, inability to rest",
    symbols: "Black and white sphinxes (opposing forces under control), starry canopy (divine protection), armor (defended position), city behind (leaving comfort), square on chest (grounded will)",
    glyph: "VII"
  },
  {
    number: 8,
    name: "Strength",
    themes: "Inner strength, compassion, gentle mastery, courage, taming through love, resilience",
    situations: "Facing challenges with grace, leading with compassion, mastering impulses through understanding, finding courage in vulnerability, gentle persistence",
    shadows: "Self-doubt disguised as humility, enabling through \"compassion\", avoiding necessary conflict, weakness masked as gentleness",
    symbols: "Woman and lion (gentle mastery of raw power), infinity symbol (unlimited inner strength), white robe (purity of approach), flowers (growth through gentleness), calm expression (inner peace)",
    glyph: "VIII"
  },
  {
    number: 9,
    name: "The Hermit",
    themes: "Solitude, inner guidance, wisdom through withdrawal, introspection, seeking truth, the inner light",
    situations: "Needing time alone, searching for deeper meaning, withdrawing to gain perspective, trusting your own counsel, illuminating the path ahead",
    shadows: "Isolation as avoidance, loneliness, refusing guidance, spiritual bypassing, elitism, hiding light from others",
    symbols: "Lantern with star (inner light and guidance), staff (support and authority), mountaintop (perspective from withdrawal), gray robes (wisdom and neutrality), snow (clarity and solitude)",
    glyph: "IX"
  },
  {
    number: 10,
    name: "Wheel of Fortune",
    themes: "Cycles, fate, change, turning points, luck, what goes around comes around, accepting flux",
    situations: "Experiencing change beyond your control, recognizing patterns and cycles, adapting to shifts, understanding timing, seeing the bigger pattern",
    shadows: "Passivity in the face of change, gambling on luck over effort, blaming fate, refusing to adapt, clinging when the wheel turns",
    symbols: "Wheel (cycles and change), sphinx on top (riddle of fate), snake descending (downward cycle), Anubis rising (upward cycle), four winged creatures (fixed points amid change), Hebrew letters (divine order)",
    glyph: "X"
  },
  {
    number: 11,
    name: "Justice",
    themes: "Fairness, truth, consequence, balance, accountability, objective judgment, karmic return",
    situations: "Facing consequences, making fair decisions, seeking truth, balancing scales, taking accountability, advocating for fairness",
    shadows: "Harsh judgment, cold objectivity without compassion, revenge disguised as justice, imbalance, legalism over spirit",
    symbols: "Scales (balance and fairness), sword (cutting to truth), red robe (passion for justice), crown (authority), pillars (stable judgment), purple cloth (spiritual law)",
    glyph: "XI"
  },
  {
    number: 12,
    name: "The Hanged Man",
    themes: "Surrender, new perspective, pause, letting go, sacrifice, seeing from a different angle, waiting",
    situations: "Being in limbo, surrendering control, gaining insight through inversion, necessary pause, sacrificing one thing for another, shifting perspective",
    shadows: "Martyrdom, stuck waiting, refusing to act when action is needed, passivity disguised as surrender, victimhood",
    symbols: "Upside-down position (inverted perspective), halo (enlightenment through surrender), tree in T-shape (living sacrifice), calm expression (acceptance), tied foot (chosen constraint), right leg crossed (ease in restraint)",
    glyph: "XII"
  },
  {
    number: 13,
    name: "Death",
    themes: "Transformation, endings, release, transition, necessary loss, clearing away, rebirth through destruction",
    situations: "Letting something die, major life transition, shedding old identity, clearing space for new growth, accepting irreversible change",
    shadows: "Clinging to what must end, destruction for its own sake, fear of change, refusal to grieve, forcing premature closure",
    symbols: "Skeleton (what remains when all else falls away), black armor (inevitability), white rose (purity in ending), rising sun (what comes after), river (flow of transition), figures of all stations (death comes to all)",
    glyph: "XIII"
  },
  {
    number: 14,
    name: "Temperance",
    themes: "Balance, moderation, alchemy, patience, synthesis, gradual progress, middle path, integration",
    situations: "Finding balance, combining opposites, taking the middle way, gradual refinement, practicing patience, integrating extremes",
    shadows: "Extremism disguised as passion, impatience, refusing to compromise, bland averaging, suppression rather than balance",
    symbols: "Angel (divine guidance), pouring water between cups (flow and balance), one foot on land and one in water (straddling worlds), sun rising (gradual emergence), triangle in square (spirit in matter), iris flowers (rainbow bridge)",
    glyph: "XIV"
  },
  {
    number: 15,
    name: "The Devil",
    themes: "Bondage, materialism, addiction, shadow work, illusion of entrapment, attachment, facing the taboo",
    situations: "Recognizing unhealthy attachments, confronting addiction or compulsion, examining what controls you, shadow integration, breaking free from false limitations",
    shadows: "Actual harmful compulsion, materialism as meaning, abusive power, refusing to see your chains, blaming external forces for internal bondage",
    symbols: "Chained figures (perceived bondage), loose chains (can be removed), inverted pentagram (spirit subordinate to matter), torch (false light), horns and bat wings (shadow and taboo), grapes and fire tail (indulgence and base desire)",
    glyph: "XV"
  },
  {
    number: 16,
    name: "The Tower",
    themes: "Sudden upheaval, revelation, destruction of false structures, liberation through crisis, ego death, shocking truth",
    situations: "Experiencing sudden change, having illusions shattered, structures collapsing, lightning-bolt realization, necessary destruction, crisis as catalyst",
    shadows: "Unnecessary destruction, clinging to ruins, creating chaos, refusing to rebuild, trauma without integration",
    symbols: "Lightning strike (sudden divine intervention), crown falling (ego toppled), figures falling (loss of security), crumbling tower (false structures destroyed), dark sky (crisis moment), flames (purifying destruction)",
    glyph: "XVI"
  },
  {
    number: 17,
    name: "The Star",
    themes: "Hope, inspiration, healing, renewal, faith, divine guidance, finding your way after darkness, spiritual nourishment",
    situations: "Recovering after crisis, finding hope again, receiving inspiration, healing, trusting in guidance, being renewed, sharing your gifts freely",
    shadows: "False hope, spiritual bypassing, naivety after trauma, refusing practical action, waiting for rescue, escapism",
    symbols: "Naked figure (vulnerability and authenticity), pouring water (giving freely without depletion), one foot on land and one in water (grounded spirituality), large star and seven smaller stars (guidance and chakras), bird in tree (soul's voice), pool and land (conscious and unconscious)",
    glyph: "XVII"
  },
  {
    number: 18,
    name: "The Moon",
    themes: "Illusion, intuition, the unconscious, fear, dreams, what lurks beneath, navigating uncertainty, the mysterious",
    situations: "Moving through confusion, trusting intuition when vision is unclear, facing fears, working with dreams, accepting you can't see the full picture, navigating by feeling",
    shadows: "Paranoia, deception, drowning in emotion, losing touch with reality, being ruled by fear, projecting shadows",
    symbols: "Moon (intuition and illusion), two towers (threshold to unknown), dog and wolf (tame and wild nature), crayfish emerging (what rises from unconscious), winding path (unclear way forward), water (unconscious realm)",
    glyph: "XVIII"
  },
  {
    number: 19,
    name: "The Sun",
    themes: "Joy, clarity, vitality, success, simple truth, childlike wonder, illumination, warmth, achieved wholeness",
    situations: "Experiencing joy, seeing things clearly, celebrating success, embracing simple pleasures, vitality and health, unambiguous truth, innocent delight",
    shadows: "Denial of shadow, forced positivity, arrogance, burning too bright, exhaustion from constant intensity, superficiality",
    symbols: "Sun (clarity and life force), naked child (innocent authenticity), white horse (pure energy), sunflowers (turning toward light), red banner (vitality and passion), walled garden (cultivated paradise)",
    glyph: "XIX"
  },
  {
    number: 20,
    name: "Judgement",
    themes: "Awakening, reckoning, resurrection, call to higher purpose, forgiveness, absolution, rising to a new level, accountability",
    situations: "Hearing your calling, rising to a new level of being, accounting for the past, forgiving self or others, experiencing spiritual awakening, answering a summons",
    shadows: "Harsh self-judgment, refusing forgiveness, apocalyptic thinking, spiritual bypassing of practical work, waiting for external validation",
    symbols: "Angel (divine call), trumpet (clear summons), rising figures (resurrection and awakening), graves opening (past released), mountains and water (earth and emotion transcended), cross on flag (spiritual purpose)",
    glyph: "XX"
  },
  {
    number: 21,
    name: "The World",
    themes: "Completion, integration, accomplishment, wholeness, cosmic consciousness, mastery, the dance, coming full circle",
    situations: "Completing a major cycle, achieving a goal, experiencing wholeness, integrating all parts, mastery, satisfaction, graduation to next level",
    shadows: "Inability to move on after completion, resting on laurels, false completion, bypassing the journey, premature celebration",
    symbols: "Dancing figure (joyful movement), wreath (completion and victory), four living creatures (integration of all elements), purple cloth (spiritual achievement), infinity ribbon (eternal cycle), nakedness (authentic wholeness)",
    glyph: "XXI"
  }
];

const VOICES = {
  mystic: {
    label: "Mystic",
    description: "Cosmic, poetic, archetypal",
    opening: "The cards whisper through the quantum foam of possibility. Let us see what pattern emerges for one who seeks.",
    closing: "May this reflection illuminate the patterns already spiraling within. The cards have spoken; now we listen.",
    framing: {
      themes: "The card carries themes of",
      situations: "In the realm of lived experience, one finds",
      shadows: "Shadows to attend",
      symbols: "Symbols woven through the image"
    }
  },
  grounded: {
    label: "Grounded",
    description: "Direct, practical, no-nonsense",
    opening: "Here's what the cards say about your situation. No fluff — just the meanings.",
    closing: "Consider this: what is one specific action you can take this week in light of what came up?",
    framing: {
      themes: "Themes",
      situations: "Situations this points to",
      shadows: "Shadows to watch",
      symbols: "Symbols on the card"
    }
  }
};

const SPREADS = {
  single: {
    label: "Single card",
    description: "One card focus — quick insight, clear message",
    positions: [null]
  },
  sao: {
    label: "Situation · Action · Outcome",
    description: "Three cards — what is present, what you can do, where this leads",
    positions: ["Situation", "Action", "Outcome"]
  },
  ppf: {
    label: "Past · Present · Future",
    description: "Three cards — where you have been, where you are, where you are going",
    positions: ["Past", "Present", "Future"]
  }
};
