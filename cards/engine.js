/* Púcas trading card game: rules engine (no screen code).
   Rules: claude/PUCAS_RULEBOOK.md and the battle draft in DONRI_PUCAS.md.
   Normal: teams of 3, 1 gem a turn (save up to 5), one Help card a turn,
   swap costs 1 gem, one move ends your turn, +10 when Strong vs.
   Little: 1 Púca each, emeralds only, no Help cards, no swapping. */
(function (root) {
  "use strict";

  /* Type chart from the creature bible: Wave > Hearth > Moss > Wave, plus
     Storm > Wave, Stone > Storm, Bog > Stone, Hearth > Bog. Glimmer and Star
     beat each other (no Star Púcas yet). */
  var TYPES = {
    wave:    { name: "Wave",    col: "#3fb7a6", dark: "#13453f", beats: ["hearth"],         gem: "Sapphire" },
    hearth:  { name: "Hearth",  col: "#ef7a3a", dark: "#5a2414", beats: ["moss", "bog"],    gem: "Ruby" },
    moss:    { name: "Moss",    col: "#8bbf52", dark: "#2c4318", beats: ["wave"],           gem: "Emerald" },
    storm:   { name: "Storm",   col: "#8fb6d9", dark: "#2a4460", beats: ["wave"],           gem: "Pearl" },
    stone:   { name: "Stone",   col: "#a9a39a", dark: "#46423c", beats: ["storm"],          gem: "Quartz" },
    bog:     { name: "Bog",     col: "#b0803a", dark: "#4a3416", beats: ["stone"],          gem: "Amber" },
    glimmer: { name: "Glimmer", col: "#b98ae0", dark: "#45305e", beats: ["star"],           gem: "Opal" }
  };
  function beats(a, b) { return TYPES[a].beats.indexOf(b) >= 0; }

  function mv(n, c, p, d, fx) { return { n: n, c: c, p: p, d: d, fx: fx || null }; }

  var CARDS = {
    dabbit:     { no: "001", name: "Dabbit",     ga: "madra uisce",  say: "MOD-ruh ISH-keh", type: "wave",   stage: 1, puff: 50,  rarity: 1, line: "dabbit",  kind: "Otter pup",        home: "The Wild North, Donegal",
                  moves: [mv("Pebble Toss", 1, 10, "A quick throw that never misses."), mv("Splash", 2, 30, "A big cold wave.")] },
    sparkit:    { no: "002", name: "Sparkit",    ga: "sionnach",     say: "SHUN-ukh",        type: "hearth", stage: 1, puff: 50,  rarity: 1, line: "sparkit", kind: "Fox cub",          home: "The Cave Plains, Roscommon",
                  moves: [mv("Pounce", 1, 10, "Quick as a fox, and just as cheeky."), mv("Ember Flick", 2, 30, "Warm sparks from its tail.")] },
    mossnub:    { no: "003", name: "Mossnub",    ga: "gráinneog",    say: "GRAWN-yog",       type: "moss",   stage: 1, puff: 50,  rarity: 1, line: "mossnub", kind: "Hedgehog",         home: "The Old Woods, Leitrim",
                  moves: [mv("Apple Bonk", 1, 10, "A friendly bonk with a red apple."), mv("Roll Up", 2, 30, "Rolls into a spiky ball. Takes 10 less next turn.", "guard")] },
    splashtail: { no: "004", name: "Splashtail", ga: "madra uisce",  say: "MOD-ruh ISH-keh", type: "wave",   stage: 2, puff: 80,  rarity: 2, line: "dabbit",  kind: "Young otter",      home: "The Wild North, Donegal",
                  moves: [mv("Pebble Sling", 1, 20, "Flicks its lucky pebble. Never misses."), mv("Tide Rush", 2, 60, "Rides a wave in.")] },
    dobharchu:  { no: "005", name: "Dobharchú",  ga: "an Dobharchú", say: "un DOW-ar-koo",   type: "wave",   stage: 3, puff: 120, rarity: 4, line: "dabbit",  kind: "Water-hound",      home: "The loughs of the north-west",
                  moves: [mv("Lough Guard", 1, 30, "Stands firm. Takes 10 less next turn.", "guard"), mv("Rolling Wave", 3, 105, "A great wave rolls in.")] },
    emberbrush: { no: "006", name: "Emberbrush", ga: "sionnach",     say: "SHUN-ukh",        type: "hearth", stage: 2, puff: 80,  rarity: 2, line: "sparkit", kind: "Young fox",        home: "The Cave Plains, Roscommon",
                  moves: [mv("Quick Pounce", 1, 20, "Fast as a flicker."), mv("Ember Burst", 2, 60, "A burst of warm sparks.")] },
    cruachan:   { no: "007", name: "Cruachan",   ga: "Cruachan",     say: "KROO-uh-khun",    type: "hearth", stage: 3, puff: 120, rarity: 4, line: "sparkit", kind: "Fire fox",         home: "The cave gate at Rathcroghan",
                  moves: [mv("Cave Glow", 1, 30, "A warm glow. Gets 10 Puff back.", "heal"), mv("Turf Fire", 3, 105, "A sweep of glowing sparks.")] },
    thornback:  { no: "008", name: "Thornback",  ga: "gráinneog",    say: "GRAWN-yog",       type: "moss",   stage: 2, puff: 80,  rarity: 2, line: "mossnub", kind: "Young hedgehog",   home: "The Old Woods, Leitrim",
                  moves: [mv("Thorn Poke", 1, 20, "A quick, prickly poke."), mv("Blossom Roll", 2, 60, "Rolls into a spiky ball. Takes 10 less next turn.", "guard")] },
    whitethorn: { no: "009", name: "Whitethorn", ga: "Sceach Gheal", say: "SHKAKH yal",      type: "moss",   stage: 3, puff: 120, rarity: 4, line: "mossnub", kind: "Guardian hedgehog", home: "The lone hawthorn",
                  moves: [mv("Hedge Shield", 1, 30, "A wall of thorns. Takes 10 less next turn.", "guard"), mv("Petal Storm", 3, 105, "A shower of hawthorn petals.")] },
    /* New families for testing: stand-in art, names still to check */
    hopsy:      { no: "010", name: "Hopsy",      ga: "giorria",     say: "GIR-ee-uh",     type: "glimmer", stage: 1, puff: 50,  rarity: 1, line: "hopsy",   kind: "Baby hare",         home: "The Curragh, Kildare",
                  moves: [mv("Hop Skip", 1, 10, "A bouncy little hop."), mv("Starlight", 2, 30, "Twinkly light. Pick up a card.", "draw")] },
    moonhopper: { no: "011", name: "Moonhopper", ga: "giorria",     say: "GIR-ee-uh",     type: "glimmer", stage: 2, puff: 80,  rarity: 2, line: "hopsy",   kind: "Young hare",        home: "The Curragh, Kildare",
                  moves: [mv("Moon Leap", 1, 20, "A leap as high as the moon."), mv("Starlight Rain", 2, 60, "Falling stars. Pick up a card.", "draw")] },
    gealach:    { no: "012", name: "Gealach",    ga: "an Ghealach", say: "un YAL-ukh",    type: "glimmer", stage: 3, puff: 120, rarity: 4, line: "hopsy",   kind: "Moon hare",         home: "The Curragh, Kildare",
                  moves: [mv("Silver Hop", 1, 30, "Gets 10 Puff back.", "heal"), mv("Moonbeam", 3, 105, "A beam of pure moonlight.")] },
    cairnie:    { no: "013", name: "Cairnie",    ga: "broc",        say: "bruck",         type: "stone",   stage: 1, puff: 50,  rarity: 1, line: "cairnie", kind: "Badger cub",        home: "The drumlin hills, Monaghan",
                  moves: [mv("Dig Dig", 1, 10, "Digs up a little stone."), mv("Stone Roll", 2, 30, "Takes 10 less next turn.", "guard")] },
    cairnback:  { no: "014", name: "Cairnback",  ga: "broc",        say: "bruck",         type: "stone",   stage: 2, puff: 80,  rarity: 2, line: "cairnie", kind: "Young badger",      home: "The drumlin hills, Monaghan",
                  moves: [mv("Rock Bump", 1, 20, "A bump with its stony back."), mv("Cairn Crash", 2, 60, "Down come the stones.")] },
    brocmor:    { no: "015", name: "Brocmór",    ga: "Broc Mór",    say: "bruck MORE",    type: "stone",   stage: 3, puff: 120, rarity: 4, line: "cairnie", kind: "Great badger",      home: "The drumlin hills, Monaghan",
                  moves: [mv("Stone Wall", 1, 30, "Takes 10 less next turn.", "guard"), mv("Landslide", 3, 105, "The whole hill rumbles.")] },
    bogbop:     { no: "016", name: "Bogbop",     ga: "cnádán",      say: "KNAW-dawn",     type: "bog",     stage: 1, puff: 50,  rarity: 1, line: "bogbop",  kind: "Natterjack toad",   home: "The Bog Heart, Offaly",
                  moves: [mv("Croak", 1, 10, "A very loud croak."), mv("Bog Splat", 2, 30, "Mud! The other Púca's next move does 10 less.", "mist")] },
    bogbellow:  { no: "017", name: "Bogbellow",  ga: "cnádán",      say: "KNAW-dawn",     type: "bog",     stage: 2, puff: 80,  rarity: 2, line: "bogbop",  kind: "Young toad",        home: "The Bog Heart, Offaly",
                  moves: [mv("Big Croak", 1, 20, "So loud the reeds shake."), mv("Mud Wave", 2, 60, "A wave of soft bog mud.")] },
    monog:      { no: "018", name: "Mónóg",      ga: "Mónóg",       say: "MOE-nogue",     type: "bog",     stage: 3, puff: 120, rarity: 4, line: "bogbop",  kind: "Bog keeper",        home: "The Bog Heart, Offaly",
                  moves: [mv("Peat Puff", 1, 30, "The other Púca's next move does 10 less.", "mist"), mv("Bog Flood", 3, 105, "The bog rises up.")] },
    puffle:     { no: "019", name: "Puffle",     ga: "puifín",      say: "PWIF-een",      type: "storm",   stage: 1, puff: 50,  rarity: 1, line: "puffle",  kind: "Puffin chick",      home: "The causeway cliffs, Antrim",
                  moves: [mv("Peck", 1, 10, "A tiny peck."), mv("Gust", 2, 30, "A gust of sea wind.")] },
    gustbeak:   { no: "020", name: "Gustbeak",   ga: "puifín",      say: "PWIF-een",      type: "storm",   stage: 2, puff: 80,  rarity: 2, line: "puffle",  kind: "Young puffin",      home: "The causeway cliffs, Antrim",
                  moves: [mv("Wing Flap", 1, 20, "Flap flap flap!"), mv("Sea Squall", 2, 60, "A squall off the sea.")] },
    toirni:     { no: "021", name: "Toirní",     ga: "Toirní",      say: "TUR-nee",       type: "storm",   stage: 3, puff: 120, rarity: 4, line: "puffle",  kind: "Thunder puffin",    home: "The causeway cliffs, Antrim",
                  moves: [mv("Thunder Dive", 1, 30, "Dives like a bolt."), mv("Storm Call", 3, 105, "Calls up the whole storm.")] },
    mactire:    { no: "022", name: "Mac Tíre",   ga: "mac tíre",    say: "mok TEER-eh",   type: "glimmer", stage: 3, puff: 140, rarity: 5, line: "mactire", kind: "Grey wolf (Mythic)", home: "Brownshill, Carlow", mythic: 1,
                  moves: [mv("Moon Howl", 1, 30, "The other Púca's next move does 10 less.", "mist"), mv("Silver Run", 3, 110, "Runs like moonlight on the hills.")] },
    mor:        { no: "023", name: "Mór",        ga: "an fia mór",  say: "un FEE-uh MORE", type: "bog",    stage: 3, puff: 140, rarity: 5, line: "mor",     kind: "Giant elk (Mythic)", home: "The Bog Heart, Offaly", mythic: 1,
                  moves: [mv("Antler Shield", 1, 30, "Takes 10 less next turn.", "guard"), mv("Ancient Stomp", 3, 110, "10,000 years of sleep, one big stomp.")] }
  };
  /* Puff changes with the game: big-kid matches use big Puff for long, back-and-forth
     matches; Little mode uses the small numbers (20 Nov 2026). */
  var PUFF = { 1: 120, 2: 220, 3: 340 }, LITTLE_PUFF = { 1: 50, 2: 80, 3: 120 };
  function puffFor(id, little) { var c = CARDS[id]; return little ? (c.mythic ? 140 : LITTLE_PUFF[c.stage]) : c.puff; }
  Object.keys(CARDS).forEach(function (k) { CARDS[k].id = k; CARDS[k].puff = CARDS[k].mythic ? 380 : PUFF[CARDS[k].stage]; });


  /* Story card backs (from the Púcas trading cards canvas). */
  function st(no, lives, loves, habit, fact, legend) { return { no: no, lives: lives, loves: loves, habit: habit, fact: fact, legend: legend }; }
  var STORY = {
    dabbit: st("001", "Rock pools under the cliffs of the Wild North, Donegal", "Sliding down wet rocks into the sea", "Keeps a favourite pebble tucked under its arm, even when asleep", "Real otters hold hands while they sleep so they don't drift apart.", "The Dobharchú guards the loughs of the north-west. It only shows itself to children who are kind to the water."),
    sparkit: st("002", "A warm den by the cave at Rathcroghan, Roscommon", "Curling up in warm turf ashes", "Its tail tip glows just before it sneezes", "A fox can hear a mouse squeak from 100 metres away.", "Long ago, bright creatures came out of the cave at Rathcroghan. Cruachan is the one who stayed to guard the doorway."),
    mossnub: st("003", "Under the lone hawthorn tree in the Old Woods", "Beetles and fallen apples", "Rolls up into a ball when it laughs", "A hedgehog has about 5,000 spines.", "Nobody cuts a lone hawthorn, because Whitethorn sleeps in its roots and keeps the doorway open."),
    splashtail: st("004", "The rock pools and sea caves of the Wild North, Donegal", "Racing the waves back to shore", "Wears its lucky pebble on a cord and checks it is still there", "Otters can close their ears and noses when they dive under the water.", "Splashtail practises guarding the rock pools every evening, getting ready to become the Dobharchú."),
    dobharchu: st("005", "Deep, quiet loughs in the north-west of Ireland", "Moonlit swims and children who are kind to the water", "Its glowing stone shines brighter when someone nearby is sad", "Otters live along rivers, lakes and coasts all over Ireland.", "Old stories from Glenade Lough tell of a great water-hound. Ours guards the loughs and only shows itself to kind children."),
    emberbrush: st("006", "The grassy mounds around the cave at Rathcroghan, Roscommon", "Chasing its own glowing tail", "Its tail flickers brighter when it is excited", "Young foxes leave home in their first autumn to find a place of their own.", "Emberbrush keeps watch at the cave mouth on cold nights, learning the old songs of the doorway."),
    cruachan: st("007", "The cave gate at Rathcroghan, Roscommon", "Telling old stories by the turf fire", "Curls its tail around itself like a warm blanket", "Rathcroghan in Roscommon was the royal seat of Connacht, home of Queen Medb in the old tales.", "Long ago, bright creatures came out of the cave at Rathcroghan. Cruachan is the one who stayed to guard the doorway."),
    thornback: st("008", "Under the hawthorn hedges of the Old Woods", "Haws, the red hawthorn berries", "Shakes off petals like confetti when it laughs", "Hawthorn flowers are called May blossom because they open in May.", "Every spring Thornback's back bursts into blossom, just like the lone hawthorn where Whitethorn sleeps."),
    hopsy: st("010", "The wide grassy plains of the Curragh, Kildare", "Moonlit races across the grass", "Its ears glow lilac when it is happy", "A baby hare is called a leveret. It is born with fur and its eyes open.", "Hares see the doorways to Wild Éire first. Some say they can hear the stars."),
    moonhopper: st("011", "The Curragh, Kildare", "Jumping over moonbeams", "Stamps its foot to say hello", "Hares do not live in burrows. They rest in a dip in the grass called a form.", "On the night of a full moon, Moonhopper hops higher than the hawthorn trees."),
    gealach: st("012", "The Curragh under the full moon", "Quiet nights and shooting stars", "Its moon mark gets brighter as the night goes on", "Gealach is an Irish word for the moon.", "When the moon is full, Gealach lights the way home for lost Púcas."),
    cairnie: st("013", "A sett in the drumlin hills of Monaghan", "Digging, worms and blackberries", "Collects shiny stones and lines them up", "Badgers keep their homes, called setts, clean and bring in fresh bedding.", "Cairnie helps build the dry stone walls that keep Wild Éire's fields safe."),
    cairnback: st("014", "The drumlin hills of Monaghan", "Stacking stones into little cairns", "Grows tiny stones on its back like a wall", "A badger's sett can have lots of tunnels and many doors.", "Every stone on Cairnback's back is from a wall it helped to mend."),
    brocmor: st("015", "Under the oldest hill in Monaghan", "Moss beds and long naps", "Moss grows on its stones like a crown", "Broc is the Irish word for badger, and mór means big.", "Brocmór guards the old stone circles and keeps them standing."),
    bogbop: st("016", "Bog pools in the Bog Heart, Offaly", "Puddles, beetles and singing at night", "Its croak sounds like a drum: bop, bop, bop!", "The natterjack is Ireland's only toad.", "On warm nights, Bogbop sings the bog awake."),
    bogbellow: st("017", "The Bog Heart, Offaly", "Mud baths", "Puffs up its throat like a balloon when it sings", "Natterjack toads walk and run instead of hopping.", "Bogbellow's song can be heard all across the bog."),
    monog: st("018", "The deepest part of the Bog Heart", "Bog cotton and long, slow days", "Grows reeds like a little hat", "Bogs grow very slowly, about 1 millimetre a year.", "Mónóg keeps the bog's secrets, buried deep and safe."),
    puffle: st("019", "The causeway cliffs of Antrim", "Small fish and windy days", "Waddles when it walks and zooms when it flies", "A puffin can carry lots of small fish in its beak at once.", "Puffle races the gulls along the giant's stepping stones."),
    gustbeak: st("020", "The causeway cliffs of Antrim", "Flying into the wind", "Its beak gets brighter in spring", "Puffins flap their wings very fast, up to 400 times a minute.", "Gustbeak can feel a storm coming before the clouds do."),
    toirni: st("021", "The stormy sea cliffs of Antrim", "Thunder and big waves", "Little sparks crackle on its wings", "Toirneach is the Irish word for thunder.", "When the sky rumbles over the Sea of Moyle, it is Toirní saying hello."),
    mactire: st("022", "The hills around Brownshill, Carlow", "Running under the moon with friends", "Howls softly to the stars every night", "Mac tíre means wolf in Irish. It means son of the land.", "Wolves are gone from our Ireland, but in Wild Éire the grey wolf still runs. It became Mythic."),
    mor: st("023", "Asleep deep in the Bog Heart, Offaly", "Long, long sleeps", "Its antlers are wider than a car", "The giant Irish elk had antlers up to 3.6 metres wide.", "Mór slept in the bog for 10,000 years. Now it is Mythic, and it woke up to meet you."),
    whitethorn: st("009", "In the roots of the lone hawthorn tree, in an old fairy fort", "Quiet mornings and the first blossom of May", "Hums so softly the hawthorn flowers sway", "People in Ireland have long left lone hawthorn trees uncut, believing they belong to the fairies.", "Nobody cuts a lone hawthorn, because Whitethorn sleeps in its roots and keeps the doorway open.")
  };
  var LINES = {
    dabbit:  ["dabbit", "splashtail", "dobharchu"],
    sparkit: ["sparkit", "emberbrush", "cruachan"],
    mossnub: ["mossnub", "thornback", "whitethorn"],
    hopsy:   ["hopsy", "moonhopper", "gealach"],
    cairnie: ["cairnie", "cairnback", "brocmor"],
    bogbop:  ["bogbop", "bogbellow", "monog"],
    puffle:  ["puffle", "gustbeak", "toirni"],
    mactire: ["mactire"],
    mor:     ["mor"]
  };
  var LINE_ORDER = ["dabbit", "sparkit", "mossnub"];
  var ALL_LINES = ["dabbit", "sparkit", "mossnub", "hopsy", "cairnie", "bogbop", "puffle"];
  var RARITY = { 1: "◆ Common · Gnáth", 2: "◆◆ Uncommon · Annamh", 3: "◆◆◆ Rare · Fíorannamh", 4: "✦ Legendary · Finscéal", 5: "✸ Mythic · Miotas" };

  var HELP = {
    oatcake: { name: "Oatcake",      img: "treat-oatcake.png", d: "+20 Puff for your Púca out front.", heal: 20 },
    honey:   { name: "Honey",        img: "treat-honey.png",   d: "+30 Puff for your Púca out front.", heal: 30 },
    berries: { name: "Blackberries", img: "treat-berries.png", d: "+10 Puff, and pick up 1 more card.", heal: 10, draw: 1 },
    wisp:    { name: "Wisp Light",   icon: "wisp", img: "help-wisp.png",             d: "Pick up 2 more cards.", draw: 2 },
    mist:    { name: "Bog Mist",     icon: "mist", img: "help-mist.png",             d: "The other Púca's next move does 10 less." },
    den:     { name: "Cosy Den",     icon: "den", img: "help-den.png",              d: "Swap your Púca for free this turn." },
    emerald:  { name: "Emerald",  icon: "emerald", img: "gem-emerald.png",  d: "Put it on any of your Púcas: +1 gem. On a Moss Púca its moves also do +10.", gem: "moss" },
    sapphire: { name: "Sapphire", icon: "sapphire", img: "gem-sapphire.png", d: "Put it on any of your Púcas: +1 gem. On a Wave Púca its moves also do +10.", gem: "wave" },
    ruby:     { name: "Ruby",     icon: "ruby", img: "gem-ruby.png",     d: "Put it on any of your Púcas: +1 gem. On a Hearth Púca its moves also do +10.", gem: "hearth" },
    pearl:    { name: "Pearl",    icon: "pearl", img: "gem-pearl.png",    d: "Put it on any of your Púcas: +1 gem. On a Storm Púca its moves also do +10.", gem: "storm" },
    quartz:   { name: "Quartz",   icon: "quartz", img: "gem-quartz.png",   d: "Put it on any of your Púcas: +1 gem. On a Stone Púca its moves also do +10.", gem: "stone" },
    amber:    { name: "Amber",    icon: "amber", img: "gem-amber.png",    d: "Put it on any of your Púcas: +1 gem. On a Bog Púca its moves also do +10.", gem: "bog" },
    opal:     { name: "Opal",     icon: "opal", img: "gem-opal.png",     d: "Put it on any of your Púcas: +1 gem. On a Glimmer Púca its moves also do +10.", gem: "glimmer" },
    water:    { name: "Rest Well Water", icon: "water", img: "help-water.png", d: "+30 Puff for a Púca that is waiting.", bench: 30 },
    pebble:   { name: "Lucky Pebble", img: "toy-pebble.png", d: "Your Púca's next move does +10.", power: 10 },
    tune:     { name: "Proin's Tune", icon: "tune", img: "help-tune.png", d: "A tune so lovely the other Púca swaps out for one that is waiting." },
    fish:     { name: "Fresh Fish", img: "treat-fish.png", d: "+20 Puff. Wave Púcas love it: +40 instead.", heal: 20, fav: "wave" },
    apple:    { name: "Crab Apple", img: "treat-apple.png", d: "+10 Puff and +1 gem for your Púca out front.", heal: 10, gemPlus: 1 },
    pinecone: { name: "Pine Cone", img: "toy-pinecone.png", d: "Bonk! 10 Puff off the other Púca out front.", hit: 10 },
    setanta:  { name: "Setanta", legend: 1, art: "legend-setanta.jpg", d: "Setanta's sliotar flies! 50 Puff off the other Púca out front.", hit: 50 },
    hound:    { name: "Culann's Hound", legend: 1, art: "legend-hound.jpg", d: "The great hound guards your Púca. The next move against it does nothing." },
    conchobar:{ name: "King Conchobar", legend: 1, art: "legend-conchobar.jpg", d: "The king cheers you on: a gem for every one of your Púcas!", gemPlus: 3, gemAll: 1 },
    gigi:     { name: "Gigi's Rest Well", legend: 1, art: "legend-gigi.jpg", d: "A Púca that is resting comes back with 40 Puff. If none are resting, your Púca out front gets +40." }
  };

  /* Where each card goes on the table: on your Púca out front, on the other Púca, or anywhere. */
  var TARGET = { oatcake: "mine", honey: "mine", berries: "mine", emerald: "mine", sapphire: "mine", ruby: "mine", pearl: "mine", quartz: "mine", amber: "mine", opal: "mine",
    mist: "theirs", wisp: "any", den: "any", water: "bench", pebble: "mine", tune: "theirs", fish: "mine", apple: "mine", pinecone: "theirs",
    setanta: "theirs", hound: "mine", conchobar: "any", gigi: "any" };
  var GEM_OF = { wave: "sapphire", hearth: "ruby", moss: "emerald", storm: "pearl", stone: "quartz", bog: "amber", glimmer: "opal" };
  /* Normal (big-kid) mode uses trading-card gems: one gem card a turn goes ON a Púca
     and stays there. Moves need that many gems on the Púca out front; gems are not used
     up. Swapping sends 1 gem home. A free Emerald arrives whenever you have no gem
     card, so you never run dry. Little mode keeps the shared emeralds (1 a turn). */
  var MON_GEMS = 5, NORMAL_HAND = 7;
  var MAX_GEMS = 5, HAND_MAX = 3, PACK_PRICE = 10, WIN_POINTS = 3;

  function stageFor(level) { return level >= 25 ? 3 : level >= 10 ? 2 : 1; }
  function myCard(puca, level) { return LINES[puca][stageFor(level) - 1]; }
  function others(puca) { return LINE_ORDER.filter(function (l) { return l !== puca; }); }

  /* Free starter deck, built around the kid's own Púca. Their Púca always leads
     (and grows with Púcas Cara); the other two starters join as friends. */
  function starterDeck(puca) {
    var o = others(puca), own = {};
    own[o[0]] = 1; own[o[1]] = 1;
    var help = { oatcake: 2, apple: 1, wisp: 2, mist: 1, den: 2, pebble: 1, emerald: 3 };
    var g = GEM_OF[CARDS[puca].type]; help[g] = (help[g] || 0) + 3;
    return { own: own, help: help, team: [o[0], o[1]], packs: 0 };
  }

  /* Packs follow a fixed path: no chance, no loot boxes. The kid can always see
     how many packs until the next Legendary. */
  function packPath(puca) {
    var o = others(puca), a = LINES[o[0]], b = LINES[o[1]], G = function (l) { return GEM_OF[CARDS[l].type]; };
    return [
      { puca: a[1], help: [G(o[0]), "apple"] },
      { puca: "hopsy", help: ["opal", "fish"] },
      { puca: b[1], help: [G(o[1]), "water"] },
      { puca: "cairnie", help: ["quartz", "pebble"] },
      { puca: a[2], help: ["tune", "honey"] },
      { puca: "bogbop", legend: "setanta", help: ["amber"] },
      { puca: "puffle", help: ["pearl", "pinecone"] },
      { puca: b[2], help: ["berries", "mist"] },
      { puca: "moonhopper", legend: "gigi", help: ["opal"] },
      { puca: "cairnback", help: ["quartz", "water"] },
      { puca: "bogbellow", help: ["amber", "apple"] },
      { puca: "gustbeak", legend: "hound", help: ["pearl"] },
      { puca: "mactire", help: ["opal", "honey"] },
      { puca: "gealach", help: ["tune", "fish"] },
      { puca: "brocmor", legend: "conchobar", help: ["quartz"] },
      { puca: "monog", help: ["amber", "pebble"] },
      { puca: "toirni", help: ["pearl", "pinecone"] },
      { puca: "mor", help: ["amber", "honey"] }
    ];
  }
  function packContents(puca, n) {
    var p = packPath(puca);
    return n < p.length ? p[n] : { help: ["oatcake", "honey", GEM_OF[CARDS[puca].type]], more: true };
  }
  function packsToLegendary(puca, n) {
    var p = packPath(puca);
    for (var i = n; i < p.length; i++) if (p[i].puca && CARDS[p[i].puca].rarity === 4) return i - n + 1;
    return null;
  }
  function packsTo(puca, n, test) {
    var p = packPath(puca);
    for (var i = n; i < p.length; i++) if (test(p[i])) return i - n + 1;
    return null;
  }
  function packsToPuca(puca, n) {
    var p = packPath(puca);
    for (var i = n; i < p.length; i++) if (p[i].puca) return i - n + 1;
    return null;
  }

  function shuffle(a, rng) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function helpList(counts) {
    var out = [];
    Object.keys(counts || {}).forEach(function (k) { for (var i = 0; i < counts[k]; i++) out.push(k); });
    return out;
  }

  /* Rua's team mirrors the kid's stages, one Púca of each line. */
  function ruaTeam(kidTeam, rng) {
    var lines = shuffle(ALL_LINES.slice(), rng);
    return kidTeam.map(function (id, i) { return LINES[lines[i % lines.length]][Math.min(3, CARDS[id].stage) - 1]; });
  }
  function ruaLittle(kidId, rng) {
    var o = ALL_LINES.filter(function (l) { return l !== CARDS[kidId].line; });
    return LINES[o[Math.floor(rng() * o.length)]][CARDS[kidId].stage - 1];
  }

  function mkMon(id, little) { var p = puffFor(id, little); return { id: id, puff: p, max: p, out: false, gems: 0, gemTypes: [] }; }
  function isGem(k) { return !!(HELP[k] && HELP[k].gem); }
  function tcg(m) { return m.mode === "normal"; }
  function hasGemCard(s) { return s.hand.some(isGem); }
  function mkSide(team, help, rng, extra, little) {
    return { mons: team.map(function (id) { return mkMon(id, little); }), front: 0, gems: 1, hand: [], legendUsed: false, shield: false, deck: shuffle(helpList(help).concat(extra || []), rng),
             guard: 0, mist: 0, power: 0, freeSwap: false, helpUsed: false, swapped: false, grew: false };
  }
  function front(s) { return s.mons[s.front]; }
  function card(mon) { return CARDS[mon.id]; }

  function newMatch(o) {
    var rng = o.rng || Math.random;
    var m = { mode: o.mode, rng: rng, turn: 0, round: 1, over: null, events: [],
              sides: [mkSide(o.kidTeam, o.mode === "normal" ? o.kidHelp : null, rng, o.mode === "normal" ? o.kidGrow : null, o.mode === "little"),
                      mkSide(o.ruaTeam, o.mode === "normal" ? o.ruaHelp : null, rng, o.mode === "normal" ? o.ruaGrow : null, o.mode === "little")] };
    if (m.mode === "normal") {
      m.sides.forEach(function (s) { s.handMax = NORMAL_HAND; s.gems = 0; draw(s, 3); });
      var sec = m.sides[1].mons[0]; sec.gems = 1; sec.gemTypes.push("moss"); draw(m.sides[1], 1); // going second: a gem on its Púca and one extra card
    }
    startTurn(m);
    return m;
  }
  /* A grow card only comes to your hand when one of your Púcas can grow into it now;
     otherwise it goes back under the deck for later. */
  function growOk(s, k) {
    var c = CARDS[k]; if (!c) return true;
    return s.mons.some(function (x) { var xc = CARDS[x.id]; return !x.out && xc.line === c.line && xc.stage + 1 === c.stage; });
  }
  function draw(s, n) {
    var k = 0, max = s.handMax || HAND_MAX, tries = 0;
    s.got = s.got || [];
    while (k < n && s.hand.length < max && s.deck.length && tries < 60) {
      var c = s.deck.pop(); tries++;
      if (!growOk(s, c)) { s.deck.unshift(c); continue; }
      s.hand.push(c); s.got.push(c); k++;
    }
    return k;
  }
  function startTurn(m) {
    var s = m.sides[m.turn], freeGem = false;
    if (!tcg(m)) s.gems = Math.min(MAX_GEMS, s.gems + 1);
    s.guard = 0; s.helpUsed = false; s.swapped = false; s.freeSwap = false; s.grew = false; s.attached = false;
    s.got = [];
    var drew = tcg(m) ? draw(s, 1) : 0;
    /* Keep gems coming: if you hold fewer than 2 gem cards, a gem of your front Púca's colour arrives too. */
    if (tcg(m) && s.hand.filter(isGem).length < 2) { freeGem = GEM_OF[CARDS[front(s).id].type] || "emerald"; s.hand.push(freeGem); s.got.push(freeGem); }
    m.events.push({ t: "turn", side: m.turn, drew: drew, freeGem: freeGem, got: s.got.slice() });
  }
  function endTurn(m) {
    if (m.over) return;
    m.turn = 1 - m.turn;
    if (m.turn === 0) m.round++;
    startTurn(m);
  }

  function dmgFor(m, si, mi) {
    var s = m.sides[si], o = m.sides[1 - si];
    var a = card(front(s)), d = card(front(o)), mvv = a.moves[mi];
    var dmg = mvv.p, strong = beats(a.type, d.type);
    if (strong) dmg += 10;
    if (o.shield) return { dmg: 0, strong: strong, mist: false, guard: false, power: false, shield: true };
    dmg += s.power || 0;
    var fm = front(s), matched = tcg(m) && fm.gemTypes.indexOf(a.type) >= 0;
    if (matched) dmg += 10;
    var mist = s.mist, guard = o.guard;
    dmg = Math.max(Math.min(10, mvv.p), dmg - mist - guard); // a move always does at least 10
    return { dmg: dmg, strong: strong, mist: mist > 0, guard: guard > 0, power: (s.power || 0) > 0, gemPower: matched };
  }
  function canMove(m, mi) {
    var s = m.sides[m.turn];
    return !m.over && card(front(s)).moves[mi].c <= (tcg(m) ? front(s).gems : s.gems);
  }
  function useMove(m, mi) {
    if (!canMove(m, mi)) return null;
    var si = m.turn, s = m.sides[si], o = m.sides[1 - si];
    var me = front(s), mvv = card(me).moves[mi], target = front(o);
    var r = dmgFor(m, si, mi);
    if (!tcg(m)) s.gems -= mvv.c;
    s.mist = 0; s.power = 0; o.guard = 0; o.shield = false;
    target.puff = Math.max(0, target.puff - r.dmg);
    var ev = { t: "move", side: si, who: me.id, target: target.id, move: mvv.n, mi: mi, dmg: r.dmg, strong: r.strong, mist: r.mist, guard: r.guard, power: r.power };
    if (mvv.fx === "guard") { s.guard = 10; ev.guardUp = true; }
    if (mvv.fx === "heal") { var h = Math.min(10, me.max - me.puff); me.puff += h; ev.heal = h; }
    if (mvv.fx === "draw") ev.drew = draw(s, 1);
    if (mvv.fx === "mist") { o.mist = 10; ev.misted = true; }
    if (r.shield) ev.shield = true;
    m.events.push(ev);
    checkPuffed(m, si);
    if (!m.over) endTurn(m);
    return ev;
  }
  function checkPuffed(m, si) {
    var o = m.sides[1 - si], target = front(o);
    if (target.puff > 0 || target.out) return;
    target.out = true;
    m.events.push({ t: "puffed", side: 1 - si, who: target.id });
    var next = -1;
    for (var i = 0; i < o.mons.length; i++) if (!o.mons[i].out) { next = i; break; }
    if (next < 0) { m.over = { winner: si }; m.events.push({ t: "win", side: si }); }
    else { o.front = next; o.guard = 0; o.shield = false; m.events.push({ t: "out", side: 1 - si, who: o.mons[next].id }); }
  }
  function damagedBench(s) {
    var best = -1;
    s.mons.forEach(function (x, j) { if (j !== s.front && !x.out && x.puff < x.max && (best < 0 || x.max - x.puff > s.mons[best].max - s.mons[best].puff)) best = j; });
    return best;
  }
  function benchAlive(s) {
    var r = [];
    s.mons.forEach(function (x, i) { if (i !== s.front && !x.out) r.push(i); });
    return r;
  }
  function canSwap(m, to) {
    var s = m.sides[m.turn];
    return m.mode === "normal" && !m.over && !s.swapped && to !== s.front && s.mons[to] && !s.mons[to].out && (s.freeSwap || front(s).gems >= 1);
  }
  function swap(m, to) {
    if (!canSwap(m, to)) return null;
    var s = m.sides[m.turn], free = s.freeSwap;
    if (!free) { var fr = front(s); fr.gems -= 1; fr.gemTypes.pop(); }
    s.freeSwap = false; s.front = to; s.swapped = true; s.guard = 0;
    var ev = { t: "swap", side: m.turn, who: s.mons[to].id, free: free };
    m.events.push(ev);
    return ev;
  }
  /* Why a Help card can't be played right now (null = it can). */
  function isGrow(k) { return !!CARDS[k]; }
  /* Which of your Púcas a grown-up card can go on (same family, one stage younger). */
  function growTargets(m, i, si) {
    var s = m.sides[si === undefined ? m.turn : si], k = s.hand[i], c = CARDS[k], r = [];
    if (!c) return r;
    s.mons.forEach(function (x, j) { var xc = CARDS[x.id]; if (!x.out && xc.line === c.line && xc.stage + 1 === c.stage) r.push(j); });
    return r;
  }
  function helpBlock(m, i) {
    var s = m.sides[m.turn];
    if (m.mode !== "normal" || m.over) return "Not in this game.";
    var k = s.hand[i];
    if (isGrow(k)) {
      if (s.grew) return "One Púca can grow each turn.";
      if (!growTargets(m, i).length) return CARDS[k].name + " grows from " + CARDS[P_LINE_PREV(k)].name + ". You need " + CARDS[P_LINE_PREV(k)].name + " on the board.";
      return null;
    }
    var h = HELP[k], f = front(s), o = m.sides[1 - m.turn];
    if (h && h.gem && tcg(m)) {
      if (s.attached) return "One gem a turn. Put the next one on tomorrow… next turn!";
      if (!gemTargets(m).length) return "Your Púcas are full of gems.";
      return null;
    }
    if (h && h.legend) {
      if (s.legendUsed) return "One Legend card a match.";
      if (k === "gigi" && !s.mons.some(function (x) { return x.out; }) && f.puff >= f.max) return "Everyone is full of puff!";
      return null;
    }
    if (s.helpUsed) return "One Help card a turn.";
    if (!h) return "No card there.";
    if (h.heal && !h.draw && !h.gemPlus && f.puff >= f.max) return "Already full of puff!";
    if (h.gem && s.gems >= MAX_GEMS && h.gem !== card(f).type) return "Your gems are full (5).";
    if (k === "wisp" && !s.deck.length) return "No cards left to pick up.";
    if (k === "den" && (s.swapped || !benchAlive(s).length)) return "No one to swap with.";
    if (k === "mist" && o.mist) return "Bog Mist is already out.";
    if (k === "water" && damagedBench(s) < 0) return "No waiting Púca needs puff.";
    if (k === "tune" && !benchAlive(o).length) return "The other side has no one waiting.";
    if (k === "pebble" && s.power) return "Your Púca already has a boost.";
    return null;
  }
  /* Which of your Púcas a gem card can go on. */
  function gemTargets(m, si) {
    var s = m.sides[si === undefined ? m.turn : si], r = [];
    s.mons.forEach(function (x, j) { if (!x.out && x.gems < MON_GEMS) r.push(j); });
    return r;
  }
  function attach(m, i, to) {
    var s = m.sides[m.turn], k = s.hand[i];
    if (!tcg(m) || m.over || !isGem(k) || s.attached) return null;
    if (to === undefined) to = s.front;
    var mon = s.mons[to];
    if (!mon || mon.out || mon.gems >= MON_GEMS) return null;
    s.hand.splice(i, 1);
    mon.gems += 1; mon.gemTypes.push(HELP[k].gem); s.attached = true;
    var ev = { t: "attach", side: m.turn, card: k, at: to, who: mon.id, match: HELP[k].gem === CARDS[mon.id].type, gems: mon.gems };
    m.events.push(ev);
    return ev;
  }
  function P_LINE_PREV(k) { var c = CARDS[k]; return LINES[c.line][c.stage - 2] || k; }
  function grow(m, i, to) {
    if (helpBlock(m, i)) return null;
    var s = m.sides[m.turn], targets = growTargets(m, i);
    if (to === undefined) to = targets.indexOf(s.front) >= 0 ? s.front : targets[0];
    if (targets.indexOf(to) < 0) return null;
    var k = s.hand.splice(i, 1)[0], mon = s.mons[to], from = mon.id, lost = mon.max - mon.puff;
    mon.id = k; mon.max = CARDS[k].puff; mon.puff = Math.max(10, mon.max - lost);
    s.grew = true;
    var ev = { t: "grow", side: m.turn, from: from, to: k, at: to, front: to === s.front };
    m.events.push(ev);
    return ev;
  }
  function playHelp(m, i, to) {
    if (isGrow(m.sides[m.turn].hand[i])) return grow(m, i, to);
    if (tcg(m) && isGem(m.sides[m.turn].hand[i])) return attach(m, i, to);
    if (helpBlock(m, i)) return null;
    var s = m.sides[m.turn], o = m.sides[1 - m.turn], k = s.hand.splice(i, 1)[0], h = HELP[k], f = front(s);
    if (h.legend) s.legendUsed = true; else s.helpUsed = true;
    var ev = { t: "help", side: m.turn, card: k, who: f.id, legend: !!h.legend };
    if (h.heal) { var amt = h.fav && card(f).type === h.fav ? h.heal * 2 : h.heal; var g = Math.min(amt, f.max - f.puff); f.puff += g; ev.heal = g; }
    if (h.gemPlus) {
      if (!tcg(m)) { s.gems = Math.min(MAX_GEMS, s.gems + h.gemPlus); ev.gem = h.gemPlus; }
      else if (h.gemAll) { var n = 0; s.mons.forEach(function (x) { if (!x.out && x.gems < MON_GEMS) { x.gems++; x.gemTypes.push("moss"); n++; } }); ev.gem = n; }
      else if (f.gems < MON_GEMS) { f.gems++; f.gemTypes.push("moss"); ev.gem = 1; }
    }
    if (h.power) { s.power = h.power; ev.power = h.power; }
    if (h.bench) { var bi = damagedBench(s); var bm = s.mons[bi]; var bg = Math.min(h.bench, bm.max - bm.puff); bm.puff += bg; ev.heal = bg; ev.who = bm.id; }
    if (k === "tune") { var ob = benchAlive(o); o.front = ob[0]; o.guard = 0; ev.swapTo = o.mons[ob[0]].id; }
    if (k === "hound") { s.shield = true; }
    if (k === "gigi") {
      var rest = -1; s.mons.forEach(function (x, j) { if (x.out && rest < 0) rest = j; });
      if (rest >= 0) { s.mons[rest].out = false; s.mons[rest].puff = 40; ev.back = s.mons[rest].id; }
      else { var gg = Math.min(40, f.max - f.puff); f.puff += gg; ev.heal = gg; }
    }
    if (h.hit) { var t = front(o); t.puff = Math.max(0, t.puff - h.hit); ev.hit = h.hit; ev.target = t.id; }
    if (h.draw) ev.drew = draw(s, h.draw);
    if (k === "mist") o.mist = 10;
    if (k === "den") s.freeSwap = true;
    if (h.gem) { s.gems = Math.min(MAX_GEMS, s.gems + 1); ev.gem = 1; if (h.gem === card(f).type) { s.power = 10; ev.power = 10; } }
    m.events.push(ev);
    if (h.hit) checkPuffed(m, m.turn);
    return ev;
  }
  function pass(m) {
    if (m.over) return null;
    var ev = { t: "pass", side: m.turn };
    m.events.push(ev);
    endTurn(m);
    return ev;
  }

  /* Rua, the friendly opponent. Returns the next single action. */
  function aiNext(m) {
    var si = m.turn, s = m.sides[si], o = m.sides[1 - si], f = front(s), fc = card(f), of = front(o), oc = card(of);
    var rng = m.rng;
    if (m.mode === "little") {
      var big = fc.moves[1];
      if (s.gems >= big.c && rng() < 0.6) return { a: "move", mi: 1 };
      if (s.gems >= fc.moves[0].c) return { a: "move", mi: 0 };
      return { a: "pass" };
    }
    var beaten = beats(oc.type, fc.type);
    var bench = benchAlive(s);
    var better = bench.filter(function (i) { return !beats(oc.type, card(s.mons[i]).type); });
    better.sort(function (a, b) {
      return (beats(card(s.mons[b]).type, oc.type) ? 1 : 0) - (beats(card(s.mons[a]).type, oc.type) ? 1 : 0);
    });
    var wantSwap = beaten && better.length && !s.swapped && f.puff > 0;
    if (tcg(m) && !s.attached) {
      var gi2 = -1; for (var q = 0; q < s.hand.length; q++) if (isGem(s.hand[q])) { gi2 = q; if (HELP[s.hand[q]].gem === fc.type) break; }
      if (gi2 >= 0) {
        var tgt = s.front;
        if (f.gems >= fc.moves[1].c || f.gems >= MON_GEMS) {
          var need = bench.filter(function (j) { return s.mons[j].gems < card(s.mons[j]).moves[1].c; });
          if (need.length) tgt = need[0];
        }
        if (s.mons[tgt].gems < MON_GEMS) return { a: "help", i: gi2, to: tgt };
      }
    }
    for (var gi = 0; gi < s.hand.length; gi++) if (isGrow(s.hand[gi]) && !helpBlock(m, gi)) return { a: "help", i: gi };
    for (var li = 0; li < s.hand.length; li++) {
      var lk = s.hand[li], lh = HELP[lk];
      if (!lh || !lh.legend || helpBlock(m, li)) continue;
      if (lk === "setanta" && of.puff >= 30) return { a: "help", i: li };
      if (lk === "hound" && f.puff <= f.max / 2) return { a: "help", i: li };
      if (lk === "conchobar" && (tcg(m) ? f.gems : s.gems) <= 1) return { a: "help", i: li };
      if (lk === "gigi" && (s.mons.some(function (x) { return x.out; }) || f.puff <= 40)) return { a: "help", i: li };
    }
    if (!s.helpUsed) {
      for (var i = 0; i < s.hand.length; i++) {
        if (isGrow(s.hand[i]) || (HELP[s.hand[i]] && HELP[s.hand[i]].legend)) continue;
        if (helpBlock(m, i)) continue;
        var k = s.hand[i], h = HELP[k];
        if (h.heal && !h.draw && (f.max - f.puff >= h.heal || f.puff <= 30)) return { a: "help", i: i };
        if (k === "berries" && f.max - f.puff >= 10) return { a: "help", i: i };
        if (k === "den" && wantSwap && (tcg(m) ? f.gems < 2 : s.gems < 2)) return { a: "help", i: i };
        if (k === "mist" && (tcg(m) ? of.gems : o.gems) >= 1) return { a: "help", i: i };
        if (h.gem && !tcg(m) && (h.gem === fc.type || fc.moves[1].c === s.gems + 1)) return { a: "help", i: i };
        if (h.gem) continue;
        if (k === "pebble" || k === "pinecone" || k === "water" || k === "apple") return { a: "help", i: i };
        if (k === "fish" && f.max - f.puff >= 20) return { a: "help", i: i };
        if (k === "tune" && beats(oc.type, fc.type)) return { a: "help", i: i };
        if (k === "wisp" && s.hand.length <= 2) return { a: "help", i: i };
      }
    }
    if (wantSwap && (s.freeSwap || (tcg(m) ? f.gems >= 1 && s.mons[better[0]].gems >= 1 : s.gems >= 2))) return { a: "swap", to: better[0] };
    var aff = [0, 1].filter(function (j) { return canMove(m, j); });
    var kills = aff.filter(function (j) { return dmgFor(m, si, j).dmg >= of.puff; });
    if (kills.length) return { a: "move", mi: kills[0] };
    if (aff.indexOf(1) >= 0) return { a: "move", mi: 1 };
    if (!tcg(m) && s.gems + 1 === fc.moves[1].c && s.gems < MAX_GEMS && rng() < 0.4) return { a: "pass" };
    if (aff.indexOf(0) >= 0) return { a: "move", mi: 0 };
    return { a: "pass" };
  }
  function aiStep(m) {
    var act = aiNext(m), ev = null;
    if (act.a === "help") ev = playHelp(m, act.i, act.to);
    else if (act.a === "swap") ev = swap(m, act.to);
    else if (act.a === "move") ev = useMove(m, act.mi);
    else ev = pass(m);
    if (!ev) ev = pass(m); // safety: never get stuck
    return ev;
  }

  var API = { TYPES: TYPES, CARDS: CARDS, STORY: STORY, LINES: LINES, LINE_ORDER: LINE_ORDER, HELP: HELP, RARITY: RARITY,
    ALL_LINES: ALL_LINES, beats: beats, packsTo: packsTo, damagedBench: damagedBench,
    puffFor: puffFor, MON_GEMS: MON_GEMS, isGem: isGem, tcg: tcg, gemTargets: gemTargets, attach: attach,
    MAX_GEMS: MAX_GEMS, TARGET: TARGET, GEM_OF: GEM_OF, isGrow: isGrow, growTargets: growTargets, grow: grow, prevOf: P_LINE_PREV, HAND_MAX: HAND_MAX, PACK_PRICE: PACK_PRICE, WIN_POINTS: WIN_POINTS,
    stageFor: stageFor, myCard: myCard, others: others, starterDeck: starterDeck, packPath: packPath, packContents: packContents,
    packsToLegendary: packsToLegendary, packsToPuca: packsToPuca, helpList: helpList, shuffle: shuffle,
    ruaTeam: ruaTeam, ruaLittle: ruaLittle, newMatch: newMatch, front: front, card: card, dmgFor: dmgFor,
    canMove: canMove, useMove: useMove, canSwap: canSwap, swap: swap, helpBlock: helpBlock, playHelp: playHelp,
    pass: pass, benchAlive: benchAlive, aiNext: aiNext, aiStep: aiStep };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.PUCAS = API;
})(this);
