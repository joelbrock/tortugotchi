/**
 * Tortugotchi: Sea Turtle PWA Game Engine
 * Core Game Logic, State Machine, and Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. STATE & CONSTANTS
  // ==========================================
  const STATES = {
    START: 'screen-start',
    BEACH: 'screen-beach',
    OCEAN: 'screen-ocean',
    BEACHING: 'screen-beaching'
  };

  const CONSERVATION_FACTS = [
    "Federal law prohibits touching, disturbing, or harassing sea turtles under the Endangered Species Act (ESA).",
    "Fines for disturbing sea turtles or nesting sites can reach up to $25,000, along with potential jail time.",
    "Always maintain a minimum distance of 10 feet (3 meters) from sea turtles on land.",
    "Crowding sea turtles causes them severe stress and can disrupt their natural nesting or resting behaviors.",
    "Do not use flash photography near sea turtles; the bright flash disorients them and can disrupt nesting mothers.",
    "Filling in beach holes and removing beach chairs prevents hatchlings from getting trapped on their way to the ocean."
  ];

  const PREDATOR_EMOJIS = ['🦀', '🦅', '🦝'];
  const TRASH_EMOJIS = ['🥤', '🍼', '🍿', '🛍️'];

  // Game state
  let currentState = STATES.START;
  let turtleName = 'Shelly';
  let turtleSpecies = 'green'; // 'green' | 'loggerhead' | 'leatherback'
  let turtleAge = 0; // days
  let hatchlingsSaved = 0;
  let beachTimer = null;
  let beachTimeRemaining = 45; // seconds
  let beachHazardsInterval = null;
  let beachHatchInterval = null;
  
  // Ocean Care stats
  let stats = {
    health: 100,
    hunger: 80, // 100 = full, 0 = starving
    joy: 80,
    clean: 100
  };
  let oceanLoops = {
    decay: null,
    hazards: null,
    debris: null,
    age: null,
    idle: null,
    bubbles: null
  };
  let activeQte = null; // 'net' | 'boat' | 'shark'
  let isHidingInShell = false;
  let isSick = false;
  let startWithBonus = false;

  // Beaching Event state
  let beachingProgress = 0; // 0 to 100
  let beachingInterval = null;
  let beachingTouristsInterval = null;
  // Earliest time (ms) the next beaching event may trigger. Keeps beaching to
  // an occasional event rather than something that interrupts every minute.
  const BEACHING_COOLDOWN_MS = 5 * 60 * 1000;
  let nextBeachingAllowedAt = 0;

  // ==========================================
  // 2. DOM ELEMENTS
  // ==========================================
  const screens = {
    start: document.getElementById('screen-start'),
    beach: document.getElementById('screen-beach'),
    ocean: document.getElementById('screen-ocean'),
    beaching: document.getElementById('screen-beaching')
  };

  // Modals
  const modals = {
    facts: document.getElementById('modal-facts'),
    rename: document.getElementById('modal-rename'),
    gameover: document.getElementById('modal-gameover'),
    migrationSuccess: document.getElementById('modal-migration-success')
  };

  // Migration Success Elements
  const btnMigrationContinue = document.getElementById('btn-migration-continue');
  const successSavedCount = document.getElementById('success-saved-count');
  const successSavedPct = document.getElementById('success-saved-pct');
  const bonusInfoCard = document.getElementById('bonus-info-card');

  // Interactive Sandboxes
  const beachSandbox = document.getElementById('beach-sandbox');
  const beachHazardsLayer = document.getElementById('beach-hazards-layer');
  const hatchlingCrawlersLayer = document.getElementById('hatchling-crawlers-layer');
  const beachTrashCan = document.getElementById('beach-trash-can');
  const oceanPlaypen = document.getElementById('ocean-playpen');
  const floatingItemsContainer = document.getElementById('floating-items-container');
  const cleaningGameOverlay = document.getElementById('cleaning-game-overlay');
  const cleaningBrush = document.getElementById('cleaning-brush');
  const beachingSandbox = document.getElementById('beaching-sandbox');
  const touristSpawnLayer = document.getElementById('tourist-spawn-layer');

  // Turtle SVG components
  const turtleContainer = document.getElementById('sea-turtle-container');
  const algaeSpots = document.getElementById('turtle-algae-spots');
  const thoughtBubble = document.getElementById('turtle-thought-bubble');
  const thoughtText = document.getElementById('thought-text');

  // Eye States
  const eyes = {
    normal: document.getElementById('turtle-eyes-normal'),
    happy: document.getElementById('turtle-eyes-happy'),
    dizzy: document.getElementById('turtle-eyes-dizzy'),
    sleeping: document.getElementById('turtle-eyes-sleeping')
  };

  // Mouth States
  const mouths = {
    normal: document.getElementById('turtle-mouth-normal'),
    eating: document.getElementById('turtle-mouth-eating'),
    sad: document.getElementById('turtle-mouth-sad')
  };

  // ==========================================
  // AUDIO: Turtle voice lines + ambient water SFX
  // ==========================================
  const MEDIA_PATH = 'media/';

  // Voice lines keyed to the speech bubble they accompany (file name → trigger).
  const TURT_VOX = {
    deepBlue:        'turtvox001_another_day_in_the_deep_blue.m4a',
    bestHuman:       'turtvox002_best_human_ever.m4a',
    bittenShell:     'turtvox003_bitten_shell_but_ok.m4a',
    somebodysComing: 'turtvox004_somebodys_coming.m4a',
    ateBagToxic:     'turtvox005_ate_a_bag_toxic.m4a',
    propellerStrike: 'turtvox006_propeller_strike_fatal_wound.m4a',
    heehee:          'turtvox006_heeheehee.m4a',
    morePlease:      'turtvox008_more_please.m4a',
    hehe:            'turtvox09_hehe_that_tickles.m4a',
    yummySeagrass:   'turtvox011_yummy_seagrass.m4a',
    letsPlay:        'turtvox012_another_turtle_lets_play.m4a',
    swimSafe:        'turtvox013_swim_safe_friend.m4a',
    applyingSalve:   'turtvox014_applying_salve.m4a',
    grewALittle:     'turtvox15_I_think_I_grew_a_little.m4a',
    crunchyCrab:     'turtvox016_crunchy_crab.m4a',
    softJellyfish:   'turtvox017_soft_jellyfish.m4a'
  };

  const WATER_SFX = [
    'water_sfx_001.m4a',
    'water_sfx_002.m4a',
    'water_sfx_003.m4a',
    'turtvox008_glub_glub_glub.m4a'
  ];

  // Play a single turtle voice line. Autoplay is allowed because the player has
  // already tapped through the start screen before any voice line fires.
  let currentVoice = null;
  function playVoice(key) {
    const file = TURT_VOX[key];
    if (!file) return;
    try {
      if (currentVoice) currentVoice.pause();
      currentVoice = new Audio(MEDIA_PATH + file);
      currentVoice.volume = 0.9;
      currentVoice.play().catch(() => {});
    } catch (e) { /* audio unsupported */ }
  }

  // Ambient underwater sound — loops continuously through the water SFX clips
  // for the whole time the player is in the ocean scene.
  let ambientAudio = null;
  let ambientIndex = 0;
  function startAmbientWater() {
    if (ambientAudio) return;
    ambientIndex = 0;
    ambientAudio = new Audio(MEDIA_PATH + WATER_SFX[0]);
    ambientAudio.volume = 0.3;
    ambientAudio.addEventListener('ended', () => {
      if (!ambientAudio) return;
      ambientIndex = (ambientIndex + 1) % WATER_SFX.length;
      ambientAudio.src = MEDIA_PATH + WATER_SFX[ambientIndex];
      ambientAudio.play().catch(() => {});
    });
    ambientAudio.play().catch(() => {});
  }
  function stopAmbientWater() {
    if (!ambientAudio) return;
    ambientAudio.pause();
    ambientAudio = null;
  }

  // Buttons
  const btnStartGame = document.getElementById('btn-start-game');
  const btnShowFactsMain = document.getElementById('btn-show-facts-main');
  const btnCloseFacts = document.getElementById('btn-close-facts');
  const btnCloseFactsBottom = document.getElementById('btn-close-facts-bottom');
  const btnDismissBeachTut = document.getElementById('btn-dismiss-beach-tut');
  const btnRenameTurtle = document.getElementById('btn-rename-turtle');
  const btnSaveRename = document.getElementById('btn-save-name');
  const btnRestartGame = document.getElementById('btn-restart-game');
  
  // Ocean Actions
  const btnFeed = document.getElementById('btn-action-feed');
  const btnClean = document.getElementById('btn-action-clean');
  const btnPlay = document.getElementById('btn-action-play');
  const btnHeal = document.getElementById('btn-action-heal');
  const feedDrawer = document.getElementById('feed-options-drawer');

  // Name inputs / dynamic name labels
  const inputTurtleNameStart = document.getElementById('input-turtle-name-start');
  const beachingTurtleName = document.getElementById('beaching-turtle-name');
  const bonusTurtleName = document.getElementById('bonus-turtle-name');

  // HUD Outputs
  const displayTurtleName = document.getElementById('display-turtle-name');
  const displayTurtleSpecies = document.getElementById('display-turtle-species');
  const turtleAgeVal = document.getElementById('turtle-age-val');
  const txtHatchlingsSaved = document.getElementById('hatchlings-saved-count');
  const beachProgressFill = document.getElementById('beach-progress-fill');
  const beachFeedbackText = document.getElementById('beach-feedback');
  const lightPollutionHud = document.getElementById('light-pollution-hud');

  // Stat Bars
  const bars = {
    health: document.getElementById('bar-health'),
    hunger: document.getElementById('bar-hunger'),
    joy: document.getElementById('bar-joy'),
    clean: document.getElementById('bar-clean')
  };
  const texts = {
    health: document.getElementById('stat-health-text'),
    hunger: document.getElementById('stat-hunger-text'),
    joy: document.getElementById('stat-joy-text'),
    clean: document.getElementById('stat-clean-text')
  };

  // QTE HUD elements
  const qteNet = document.getElementById('qte-net-overlay');
  const netSwipeFill = document.getElementById('net-swipe-fill');
  const qteBoat = document.getElementById('qte-boat-overlay');
  const btnQteDive = document.getElementById('btn-qte-dive');
  const qteShark = document.getElementById('qte-shark-overlay');
  const btnQteHide = document.getElementById('btn-qte-hide');

  // Beaching Event HUD elements
  const beachingProgressFill = document.getElementById('beaching-progress-fill');
  const beachingProgressText = document.getElementById('beaching-progress-text');
  const touristFactText = document.getElementById('tourist-fact-text');

  // PWA Banner Elements
  const pwaInstallBanner = document.getElementById('pwa-install-banner');
  const btnPwaInstall = document.getElementById('btn-pwa-install');
  const btnPwaClose = document.getElementById('btn-pwa-close');

  // ==========================================
  // 3. PWA INSTALLATION PROMPT
  // ==========================================
  // iOS Safari does NOT fire `beforeinstallprompt` and has no programmatic
  // install API. Instead we detect iOS and show a manual instruction banner
  // pointing the user to Share → Add to Home Screen.
  const ua = navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad iPadOS
  const isInStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const dismissedKey = 'tortugotchi_pwa_dismissed';
  const wasDismissed = localStorage.getItem(dismissedKey) === '1';

  const bannerTextEl = pwaInstallBanner.querySelector('.banner-text');

  let deferredPrompt = null;

  function showBanner() {
    if (isInStandalone || wasDismissed) return;
    pwaInstallBanner.classList.remove('hidden');
  }

  // Chromium path (desktop Chrome/Edge, Android Chrome)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnPwaInstall.classList.remove('hidden');
    btnPwaInstall.textContent = 'Install';
    showBanner();
  });

  window.addEventListener('appinstalled', () => {
    pwaInstallBanner.classList.add('hidden');
    deferredPrompt = null;
  });

  btnPwaInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_) { /* ignore */ }
      deferredPrompt = null;
      pwaInstallBanner.classList.add('hidden');
    }
  });

  btnPwaClose.addEventListener('click', () => {
    pwaInstallBanner.classList.add('hidden');
    localStorage.setItem(dismissedKey, '1');
  });

  // Platform-specific manual fallbacks for browsers where
  // `beforeinstallprompt` is either not supported or hasn't fired yet.
  const isAndroid = /Android/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isSamsung = /SamsungBrowser/i.test(ua);
  const isChromiumMobile = isAndroid && /Chrome|CriOS|EdgA/i.test(ua) && !isFirefox && !isSamsung;

  function showManualBanner(headline, instructions) {
    if (isInStandalone || wasDismissed) return;
    if (bannerTextEl) {
      const h = bannerTextEl.querySelector('h4');
      const p = bannerTextEl.querySelector('p');
      if (h) h.textContent = headline;
      if (p) p.textContent = instructions;
    }
    btnPwaInstall.classList.add('hidden');
    showBanner();
  }

  if (isIos && !isInStandalone && !wasDismissed) {
    // iOS Safari — Share → Add to Home Screen
    setTimeout(() => {
      showManualBanner(
        'Add Tortugotchi to Home Screen',
        'Tap the Share icon ↑ in Safari, then "Add to Home Screen" to play offline.'
      );
    }, 1500);
  } else if (isFirefox && isAndroid && !isInStandalone && !wasDismissed) {
    // Firefox Android — no beforeinstallprompt; user must use menu
    setTimeout(() => {
      showManualBanner(
        'Install Tortugotchi',
        'Tap the ⋮ menu in Firefox, then "Install" or "Add to Home Screen".'
      );
    }, 1500);
  } else if (isSamsung && !isInStandalone && !wasDismissed) {
    setTimeout(() => {
      showManualBanner(
        'Install Tortugotchi',
        'Tap the ⋮ menu, then "Add page to" → "Home screen".'
      );
    }, 1500);
  } else if (isChromiumMobile && !isInStandalone && !wasDismissed) {
    // Chrome/Edge on Android — beforeinstallprompt SHOULD fire, but engagement
    // heuristics or HTTP serving can suppress it. If it hasn't fired after a
    // few seconds, fall back to manual instructions so the banner still
    // appears.
    setTimeout(() => {
      if (!deferredPrompt && pwaInstallBanner.classList.contains('hidden')) {
        showManualBanner(
          'Install Tortugotchi',
          'Tap the ⋮ menu in Chrome, then "Install app" or "Add to Home screen".'
        );
      }
    }, 6000);
  }

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker registered successfully!', reg.scope))
        .catch((err) => console.log('Service Worker registration failed:', err));
    });
  }

  // ==========================================
  // 4. TRANSITIONS & STATE MACHINE
  // ==========================================
  function changeState(newState) {
    const outgoing = document.querySelector('.game-screen.active');
    const incomingEl = screens[newState.split('-')[1]];

    const finish = () => {
      Object.values(screens).forEach(s => {
        s.classList.remove('active', 'screen-exit', 'screen-enter');
      });
      currentState = newState;
      incomingEl.classList.add('active');
      // Force reflow so the enter animation actually plays
      void incomingEl.offsetWidth;
      incomingEl.classList.add('screen-enter');
      setTimeout(() => incomingEl.classList.remove('screen-enter'), 600);

      if (newState === STATES.BEACH) initBeachPhase();
      else if (newState === STATES.OCEAN) initOceanPhase();
      else if (newState === STATES.BEACHING) initBeachingPhase();
    };

    if (outgoing && outgoing !== incomingEl) {
      outgoing.classList.add('screen-exit');
      setTimeout(finish, 320);
    } else {
      finish();
    }
  }

  // Initialize Beach Nest Phase
  function initBeachPhase() {
    hatchlingsSaved = 0;
    beachTimeRemaining = 45;
    txtHatchlingsSaved.textContent = "0 / 20";
    beachHazardsLayer.innerHTML = '';
    hatchlingCrawlersLayer.innerHTML = '';
    beachProgressFill.style.width = "100%";
    beachProgressFill.classList.remove('warning');
    beachFeedbackText.textContent = "Guarding nest... Keep lights off and clear beach hazards!";
    lightPollutionHud.classList.add('hidden');

    // Species assignment text
    const selectedSpeciesRadio = document.querySelector('input[name="species"]:checked');
    turtleSpecies = selectedSpeciesRadio ? selectedSpeciesRadio.value : 'green';
    
    // Clear existing beach intervals
    clearInterval(beachTimer);
    clearInterval(beachHazardsInterval);
    clearInterval(beachHatchInterval);

    // Beach Phase Timer (45 seconds total)
    beachTimer = setInterval(() => {
      beachTimeRemaining--;
      const pct = (beachTimeRemaining / 45) * 100;
      beachProgressFill.style.width = `${pct}%`;

      if (beachTimeRemaining <= 15) {
        beachProgressFill.classList.add('warning');
      }

      // Start Hatching during the last 20 seconds
      if (beachTimeRemaining === 20) {
        beachFeedbackText.textContent = "🥚 Hatching has begun! Help them reach the moonlit ocean!";
        startHatchlingsCrawl();
      }

      if (beachTimeRemaining <= 0) {
        endBeachPhase();
      }
    }, 1000);

    // Hazard spawning cycle (every 3.5 seconds)
    beachHazardsInterval = setInterval(() => {
      if (beachTimeRemaining > 15) {
        spawnBeachHazard();
      } else {
        // Higher intensity during crawling phase
        if (Math.random() > 0.4) spawnBeachHazard();
      }
    }, 3500);
  }

  // Initialize Ocean Rearing Phase
  function initOceanPhase() {
    // Clear any beach intervals
    clearInterval(beachTimer);
    clearInterval(beachHazardsInterval);
    clearInterval(beachHatchInterval);

    // Reset ocean stats if it's a new game (Age = 0)
    if (turtleAge === 0) {
      if (startWithBonus) {
        stats = { health: 100, hunger: 100, joy: 100, clean: 100 };
      } else {
        stats = { health: 100, hunger: 80, joy: 80, clean: 100 };
      }
      isSick = false;
      isHidingInShell = false;
      startWithBonus = false; // Reset the flag
    }

    // Set Species details in HUD
    const speciesNames = {
      green: "Green Sea Turtle",
      loggerhead: "Loggerhead Sea Turtle",
      leatherback: "Leatherback Sea Turtle"
    };
    displayTurtleSpecies.textContent = speciesNames[turtleSpecies] || "Sea Turtle";
    displayTurtleName.textContent = turtleName;
    turtleAgeVal.textContent = formatAge(turtleAge);
    applySpeciesAppearance();
    applyGrowthStage();

    updateStatBars();
    setEyeState('normal');
    setMouthState('normal');

    // Core loops
    startOceanLoops();
  }

  function startOceanLoops() {
    clearOceanLoops();

    // 1. Stats decay — idle-game pace. A healthy turtle lasts many hours
    // between feedings, so players can come back across days/weeks.
    // Decay tick is still 1s for smooth bars but rates are tuned for hours.
    oceanLoops.decay = setInterval(() => {
      if (activeQte) return;

      // ~0.15/s hunger ≈ depletes from 100→0 in ~11 minutes of active play,
      // but with offline catch-up capped at 24h of decay, a fed turtle will
      // still be alive when the player returns the next day.
      stats.hunger = Math.max(0, stats.hunger - 0.15);
      stats.joy = Math.max(0, stats.joy - 0.18);
      stats.clean = Math.max(0, stats.clean - 0.08);

      // Health only suffers under prolonged neglect (any stat near zero)
      let penaltyCount = 0;
      if (stats.hunger < 20) penaltyCount++;
      if (stats.joy < 20) penaltyCount++;
      if (stats.clean < 25) penaltyCount++;

      if (penaltyCount > 0) {
        stats.health = Math.max(0, stats.health - (penaltyCount * 0.4));
        setMouthState('sad');
        if (Math.random() > 0.85) {
          triggerThoughtBubble(getRandomLowStatThought());
        }
      } else {
        if (stats.hunger > 60 && stats.joy > 60 && stats.clean > 60) {
          stats.health = Math.min(100, stats.health + 0.15);
        }
        setMouthState('normal');
      }

      // Cleanliness visuals (algae visibility)
      if (stats.clean < 50) {
        algaeSpots.classList.remove('hidden');
      } else {
        algaeSpots.classList.add('hidden');
      }

      // Check for sickness from eating plastic
      if (isSick) {
        stats.health = Math.max(0, stats.health - 2);
        setEyeState('dizzy');
        if (Math.random() > 0.8) triggerThoughtBubble("Ouch, tummy hurts... 🩺");
      }

      updateStatBars();
      checkGameOver();
    }, 1000);

    // 2. Aging — sea turtle ages in proportion to how healthy/cared-for it is.
    // A neglected turtle barely grows; a thriving one ages quickly and reaches
    // adulthood over weeks of real-world play.
    // Tick every 10s; ageProgress accumulates fractional days until it hits 1.
    let ageProgress = 0;
    oceanLoops.age = setInterval(() => {
      if (activeQte) return;
      const gained = computeAgeGain(10);
      ageProgress += gained;

      if (ageProgress >= 1) {
        const wholeDays = Math.floor(ageProgress);
        ageProgress -= wholeDays;
        turtleAge += wholeDays;
        turtleAgeVal.textContent = formatAge(turtleAge);
        applyGrowthStage();
        if (wholeDays > 0 && Math.random() > 0.7) {
          triggerThoughtBubble(getGrowthThought(), 2200, 'grewALittle');
        }
      }

      saveProgress();

      // Beaching is an occasional event for healthy adults. A cooldown plus a
      // low per-tick chance keeps it to roughly once every several minutes
      // rather than interrupting play every minute.
      if (turtleAge > 7 && stats.health > 50 &&
          Date.now() >= nextBeachingAllowedAt && Math.random() < 0.04) {
        nextBeachingAllowedAt = Date.now() + BEACHING_COOLDOWN_MS;
        changeState(STATES.BEACHING);
      }
    }, 10000);

    // 3. Debris Generator — gentle idle pace
    oceanLoops.debris = setInterval(() => {
      if (activeQte || currentState !== STATES.OCEAN) return;
      if (Math.random() > 0.55) {
        spawnFloatingDebris();
      }
    }, 18000);

    // 4. Random QTE Hazards — frequent rhythm. Roughly one hazard every ~45s
    // on average (75% chance per 60s tick). Ignoring them is the main neglect
    // risk in idle mode.
    oceanLoops.hazards = setInterval(() => {
      if (activeQte || currentState !== STATES.OCEAN) return;
      if (Math.random() < 0.75) {
        triggerQteHazard();
      }
    }, 60000);

    // 5. Idle behaviors — turtle does cute things when not being interacted with
    oceanLoops.idle = setInterval(() => {
      if (activeQte || currentState !== STATES.OCEAN) return;
      triggerIdleBehavior();
    }, 4500);

    // 6. Ambient bubble stream
    oceanLoops.bubbles = setInterval(() => {
      if (currentState !== STATES.OCEAN) return;
      spawnAmbientBubble();
    }, 1200);

    // 7. Ambient underwater sound for the ocean scene
    startAmbientWater();
  }

  function clearOceanLoops() {
    Object.values(oceanLoops).forEach(loop => clearInterval(loop));
    stopAmbientWater();
  }

  // ==========================================
  // 5. LOCAL STORAGE SAVING/LOADING
  // ==========================================
  function saveProgress() {
    const saveData = {
      name: turtleName,
      species: turtleSpecies,
      age: turtleAge,
      stats: stats,
      isSick: isSick,
      savedAt: Date.now()
    };
    localStorage.setItem('tortugotchi_save', JSON.stringify(saveData));
  }

  // Save before the tab/window closes so progress is captured even between
  // 10-second auto-save ticks.
  window.addEventListener('pagehide', saveProgress);
  window.addEventListener('beforeunload', saveProgress);

  const ALLOWED_SPECIES = ['green', 'loggerhead', 'leatherback'];
  function clampStat(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  }
  function sanitizeName(n) {
    if (typeof n !== 'string') return 'Shelly';
    // Strip control chars and HTML-relevant punctuation; cap at 12 like the input.
    const cleaned = n.replace(/[\x00-\x1f<>"'`\\]/g, '').trim().slice(0, 12);
    return cleaned.length ? cleaned : 'Shelly';
  }

  function loadProgress() {
    const saved = localStorage.getItem('tortugotchi_save');
    if (!saved) return false;
    // Reject obviously oversized payloads (defends against extension-planted bloat).
    if (saved.length > 4096) {
      console.warn('Save file rejected: oversized.');
      localStorage.removeItem('tortugotchi_save');
      return false;
    }
    let data;
    try { data = JSON.parse(saved); } catch (e) {
      console.error('Failed to parse save file, resetting.', e);
      return false;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

    turtleName = sanitizeName(data.name);
    turtleSpecies = ALLOWED_SPECIES.includes(data.species) ? data.species : 'green';
    const ageNum = Number(data.age);
    turtleAge = Number.isFinite(ageNum) && ageNum >= 0 ? Math.floor(ageNum) : 0;

    const s = data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)
      ? data.stats : {};
    stats = {
      health: clampStat(s.health ?? 100),
      hunger: clampStat(s.hunger ?? 80),
      joy:    clampStat(s.joy    ?? 80),
      clean:  clampStat(s.clean  ?? 100)
    };
    isSick = data.isSick === true;

    const savedAt = Number(data.savedAt);
    if (Number.isFinite(savedAt) && savedAt > 0 && savedAt <= Date.now()) {
      const elapsedSec = Math.max(0, (Date.now() - savedAt) / 1000);
      const cappedSec = Math.min(elapsedSec, 24 * 60 * 60);
      applyOfflineProgression(cappedSec);
    }
    return true;
  }

  function applyOfflineProgression(seconds) {
    // Mirror the per-second rates from the decay loop
    stats.hunger = Math.max(0, stats.hunger - 0.15 * seconds);
    stats.joy   = Math.max(0, stats.joy   - 0.18 * seconds);
    stats.clean = Math.max(0, stats.clean - 0.08 * seconds);

    // Approximate health behavior over the elapsed window
    const avgEnd = (stats.hunger + stats.joy + stats.clean) / 3;
    if (avgEnd < 20) {
      stats.health = Math.max(0, stats.health - 0.4 * seconds * 0.5); // gradual neglect damage
    } else if (avgEnd > 60) {
      stats.health = Math.min(100, stats.health + 0.05 * seconds * 0.2);
    }

    // Award age progression for the healthy portion of the absence
    const offlineDays = computeAgeGain(seconds);
    turtleAge += Math.floor(offlineDays);
  }

  // ==========================================
  // AGING & GROWTH HELPERS
  // ==========================================
  // Returns fractional days gained for `seconds` of game time, based on how
  // healthy/cared-for the turtle is. Healthy turtle: 1 day per ~3 minutes of
  // active play (~480 days/day of real play if perfectly tended).
  // Neglected turtle: little to no growth.
  function computeAgeGain(seconds) {
    const avg = (stats.hunger + stats.joy + stats.clean) / 3;
    // Tiered days-per-second tuned so peak care = ~1 day every 15s.
    let dps;
    if (stats.health < 25 || avg < 20) dps = 0;          // neglected: no growth
    else if (avg < 40)  dps = 1 / 120;                    // poor: 1 day / 2 min
    else if (avg < 60)  dps = 1 / 60;                     // mediocre: 1 day / 1 min
    else if (avg < 75)  dps = 1 / 35;                     // healthy: 1 day / 35s
    else if (avg < 90)  dps = 1 / 22;                     // very healthy: 1 day / 22s
    else                dps = 1 / 15;                     // thriving: 1 day / 15s
    return seconds * dps;
  }

  function formatAge(days) {
    if (days < 7)   return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    if (days < 30)  return `${Math.floor(days / 7)}w ${days % 7}d`;
    if (days < 365) {
      const m = Math.floor(days / 30);
      const d = days % 30;
      return `${m}mo ${d}d`;
    }
    const years = Math.floor(days / 365);
    const remMonths = Math.floor((days % 365) / 30);
    return `${years}y ${remMonths}mo`;
  }

  function growthStage(days) {
    if (days < 7)   return 'hatchling';
    if (days < 30)  return 'juvenile';
    if (days < 120) return 'subadult';
    if (days < 365) return 'adult';
    return 'elder';
  }

  function applyGrowthStage() {
    const stage = growthStage(turtleAge);
    turtleContainer.classList.remove(
      'stage-hatchling', 'stage-juvenile', 'stage-subadult', 'stage-adult', 'stage-elder'
    );
    turtleContainer.classList.add(`stage-${stage}`);
  }

  function applySpeciesAppearance() {
    turtleContainer.classList.remove('species-green', 'species-loggerhead', 'species-leatherback');
    turtleContainer.classList.add(`species-${turtleSpecies}`);
  }

  function getGrowthThought() {
    const thoughts = [
      "I think I grew a little! 🌱",
      "Getting stronger! 💪",
      "My shell feels bigger! 🐢",
      "Another day in the deep blue 🌊"
    ];
    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }

  // ==========================================
  // 6. BEACH PHASE DETAILS & HAZARDS
  // ==========================================

  // Spawn Sand Hazards (Trash, Hole, Light, Predator)
  function spawnBeachHazard() {
    if (currentState !== STATES.BEACH) return;

    const r = Math.random();
    
    if (r < 0.25) {
      // Spawn Light source if one doesn't exist
      if (!document.querySelector('.beach-light-source')) {
        createStreetlight();
      } else {
        spawnTrash();
      }
    } else if (r < 0.5) {
      // Spawn Deep Hole
      spawnSandHole();
    } else if (r < 0.8) {
      // Spawn Predator (crab, seagull)
      spawnPredator();
    } else {
      // Spawn Beach Trash
      spawnTrash();
    }
  }

  // Spawn Trash on Beach
  function spawnTrash() {
    const trash = document.createElement('div');
    trash.className = 'beach-trash-item';
    trash.textContent = TRASH_EMOJIS[Math.floor(Math.random() * TRASH_EMOJIS.length)];
    
    // Position randomly on beach
    const beachWidth = beachSandbox.clientWidth;
    const beachHeight = beachSandbox.clientHeight;
    
    // Confine to middle/lower beach
    const x = Math.random() * (beachWidth - 40) + 10;
    const y = Math.random() * (beachHeight - 170) + 80;
    
    trash.style.left = `${x}px`;
    trash.style.top = `${y}px`;

    // Make interactive (Click fallback & simple drag)
    let isDragging = false;
    let startX = 0, startY = 0;
    let originalLeft = x, originalTop = y;

    const dragStart = (e) => {
      isDragging = true;
      trash.style.transition = 'none';
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX - trash.offsetLeft;
      startY = clientY - trash.offsetTop;
    };

    const dragMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const nextX = clientX - startX;
      const nextY = clientY - startY;

      trash.style.left = `${nextX}px`;
      trash.style.top = `${nextY}px`;

      // Check overlay hover on recycle bin
      const binRect = beachTrashCan.getBoundingClientRect();
      const trashRect = trash.getBoundingClientRect();
      
      if (
        trashRect.right > binRect.left &&
        trashRect.left < binRect.right &&
        trashRect.bottom > binRect.top &&
        trashRect.top < binRect.bottom
      ) {
        beachTrashCan.classList.add('drag-hover');
      } else {
        beachTrashCan.classList.remove('drag-hover');
      }
    };

    const dragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      beachTrashCan.classList.remove('drag-hover');

      const binRect = beachTrashCan.getBoundingClientRect();
      const trashRect = trash.getBoundingClientRect();

      if (
        trashRect.right > binRect.left &&
        trashRect.left < binRect.right &&
        trashRect.bottom > binRect.top &&
        trashRect.top < binRect.bottom
      ) {
        // Successfully recycled!
        trash.remove();
        beachFeedbackText.textContent = "♻️ Trash recycled! Path cleared (+10)";
        spawnScoreAlert(trashRect.left, trashRect.top, "♻️ Clean!");
      } else {
        // Click/Tap fallback: if moved only slightly, recycle directly on click
        const diffX = Math.abs(parseFloat(trash.style.left) - originalLeft);
        const diffY = Math.abs(parseFloat(trash.style.top) - originalTop);
        if (diffX < 5 && diffY < 5) {
          // Recycle directly
          trash.remove();
          beachFeedbackText.textContent = "♻️ Trash recycled! Path cleared (+10)";
          spawnScoreAlert(originalLeft, originalTop, "♻️ Clean!");
        } else {
          // Snap back
          trash.style.transition = 'all 0.3s ease';
          trash.style.left = `${originalLeft}px`;
          trash.style.top = `${originalTop}px`;
        }
      }
    };

    trash.addEventListener('mousedown', dragStart);
    trash.addEventListener('touchstart', dragStart, { passive: false });
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('touchend', dragEnd);

    beachHazardsLayer.appendChild(trash);
  }

  // Spawn deep holes in sand
  function spawnSandHole() {
    const hole = document.createElement('div');
    hole.className = 'beach-hole-item';
    
    const beachWidth = beachSandbox.clientWidth;
    const beachHeight = beachSandbox.clientHeight;

    const x = Math.random() * (beachWidth - 60) + 10;
    const y = Math.random() * (beachHeight - 180) + 90;

    hole.style.left = `${x}px`;
    hole.style.top = `${y}px`;

    let clicksRequired = 2;
    hole.addEventListener('click', () => {
      clicksRequired--;
      if (clicksRequired === 1) {
        hole.classList.add('filling');
        beachFeedbackText.textContent = "⏳ Filling hole...";
      } else if (clicksRequired <= 0) {
        hole.remove();
        beachFeedbackText.textContent = "⛱️ Sand hole filled! Safe to crawl.";
      }
    });

    beachHazardsLayer.appendChild(hole);
  }

  // Spawn beach predators (Crabs or Gulls)
  function spawnPredator() {
    const predator = document.createElement('div');
    predator.className = 'beach-predator-item';
    predator.textContent = PREDATOR_EMOJIS[Math.floor(Math.random() * PREDATOR_EMOJIS.length)];

    const beachWidth = beachSandbox.clientWidth;
    const beachHeight = beachSandbox.clientHeight;

    // Start at random edge
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -40 : beachWidth + 10;
    const startY = Math.random() * (beachHeight - 160) + 60;
    
    predator.style.left = `${startX}px`;
    predator.style.top = `${startY}px`;

    beachHazardsLayer.appendChild(predator);

    // Animate moving toward nest
    const nestX = beachWidth / 2;
    const nestY = beachHeight - 65;

    let posX = startX;
    let posY = startY;

    const speed = Math.random() * 0.8 + 0.6;
    
    const moveInterval = setInterval(() => {
      if (currentState !== STATES.BEACH || !predator.parentNode) {
        clearInterval(moveInterval);
        return;
      }

      // Direct path to nest
      const dx = nestX - posX;
      const dy = nestY - posY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15) {
        // Predator reached the nest!
        clearInterval(moveInterval);
        predator.remove();
        beachFeedbackText.textContent = "🦅 A predator got close! Keep them away!";
        // Screen shake to show impact
        screens.beach.classList.add('shake-element');
        setTimeout(() => screens.beach.classList.remove('shake-element'), 400);
      } else {
        posX += (dx / dist) * speed;
        posY += (dy / dist) * speed;
        predator.style.left = `${posX}px`;
        predator.style.top = `${posY}px`;
      }
    }, 30);

    // Tap to scare away
    predator.addEventListener('click', (e) => {
      clearInterval(moveInterval);
      predator.classList.add('predator-scared');
      beachFeedbackText.textContent = "💥 Scared off the predator!";
      spawnScoreAlert(e.clientX - 10, e.clientY - 20, "💥 Shoo!");
      setTimeout(() => predator.remove(), 400);
    });
  }

  // Create Streetlight/Light Pollution
  function createStreetlight() {
    const light = document.createElement('div');
    light.className = 'beach-light-source';
    
    // Put on the right or left edge midway
    const onLeft = Math.random() > 0.5;
    light.style.left = onLeft ? '10px' : `${beachSandbox.clientWidth - 60}px`;
    if (!onLeft) light.style.transform = 'scaleX(-1)';

    light.innerHTML = `
      <div class="light-pole"></div>
      <div class="light-bulb"></div>
      <div class="light-beam"></div>
    `;

    beachHazardsLayer.appendChild(light);
    lightPollutionHud.classList.remove('hidden');

    // Tap bulb/light to turn off
    light.addEventListener('click', () => {
      if (!light.classList.contains('off')) {
        light.classList.add('off');
        lightPollutionHud.classList.add('hidden');
        beachFeedbackText.textContent = "💡 Streetlight turned off! Hatchlings can see the moon.";
        // Automatically delete after a few seconds
        setTimeout(() => light.remove(), 5000);
      }
    });
  }

  // Hatchling Crawford Sequence
  function startHatchlingsCrawl() {
    let spawnedHatchlings = 0;
    const maxHatchlings = 20;

    beachHatchInterval = setInterval(() => {
      if (currentState !== STATES.BEACH || spawnedHatchlings >= maxHatchlings) {
        clearInterval(beachHatchInterval);
        return;
      }

      spawnSingleHatchling(spawnedHatchlings);
      spawnedHatchlings++;
    }, 1000);
  }

  function spawnSingleHatchling(index) {
    const crawler = document.createElement('div');
    crawler.className = 'hatchling-crawler';
    crawler.id = `hatchling-${index}`;
    
    // Spawn from the nest mound center
    const nestMound = document.querySelector('.nest-mound');
    const nestRect = nestMound.getBoundingClientRect();
    const sandboxRect = beachSandbox.getBoundingClientRect();

    let startX = (nestRect.left - sandboxRect.left) + (nestRect.width / 2) - 12;
    let startY = (nestRect.top - sandboxRect.top) + 10;

    crawler.style.left = `${startX}px`;
    crawler.style.top = `${startY}px`;

    // Inline SVG for the cute baby turtle
    crawler.innerHTML = `
      <svg class="hatchling-crawler-svg" viewBox="0 0 40 40">
        <!-- Flippers -->
        <path d="M5 15 C 2 12, 0 16, 8 20 C 10 20, 11 18, 12 17" fill="#52b788"/>
        <path d="M35 15 C 38 12, 40 16, 32 20 C 30 20, 29 18, 28 17" fill="#52b788"/>
        <!-- Rear flippers -->
        <path d="M12 30 L 8 35 L 12 34" fill="#2d6a4f"/>
        <path d="M28 30 L 32 35 L 28 34" fill="#2d6a4f"/>
        <!-- Shell -->
        <ellipse cx="20" cy="22" rx="10" ry="12" fill="#1b4332" stroke="#2d6a4f" stroke-width="1.5"/>
        <!-- Head -->
        <ellipse cx="20" cy="8" rx="5" ry="6" fill="#2d6a4f"/>
        <circle cx="18" cy="6" r="1" fill="#ffffff"/>
        <circle cx="22" cy="6" r="1" fill="#ffffff"/>
      </svg>
    `;

    hatchlingCrawlersLayer.appendChild(crawler);

    // Movement loop
    let posX = startX;
    let posY = startY;
    let isStuck = false;
    let angle = 0; // heading

    const crawlInterval = setInterval(() => {
      if (currentState !== STATES.BEACH || !crawler.parentNode) {
        clearInterval(crawlInterval);
        return;
      }

      // Check collision with hazards (Trash, Holes, Predators)
      const crawlerRect = crawler.getBoundingClientRect();

      // 1. Check predators
      const predators = document.querySelectorAll('.beach-predator-item');
      for (let pred of predators) {
        const predRect = pred.getBoundingClientRect();
        if (checkOverlap(crawlerRect, predRect) && !pred.classList.contains('predator-scared')) {
          // Predator eats hatchling!
          crawler.remove();
          clearInterval(crawlInterval);
          return;
        }
      }

      // 2. Check holes
      const holes = document.querySelectorAll('.beach-hole-item');
      let stuckInHole = false;
      for (let hole of holes) {
        const holeRect = hole.getBoundingClientRect();
        if (checkOverlap(crawlerRect, holeRect)) {
          stuckInHole = true;
          break;
        }
      }

      // 3. Check Trash
      const trashItems = document.querySelectorAll('.beach-trash-item');
      let blockedByTrash = false;
      for (let tr of trashItems) {
        const trashRect = tr.getBoundingClientRect();
        if (checkOverlap(crawlerRect, trashRect)) {
          blockedByTrash = true;
          break;
        }
      }

      if (stuckInHole || blockedByTrash) {
        // Stuck!
        isStuck = true;
        // Make little struggling movement
        crawler.style.transform = `scale(0.85) rotate(${Math.sin(Date.now() / 100) * 15}deg)`;
        return;
      } else {
        isStuck = false;
      }

      // Determine Target Direction
      // Normal target: the sea at top (y = 0)
      let targetX = posX;
      let targetY = 0;

      // Check if light pollution is active
      const activeLight = document.querySelector('.beach-light-source:not(.off)');
      if (activeLight) {
        // Disoriented! Crawl toward the light instead
        const lightRect = activeLight.getBoundingClientRect();
        const sandboxRect = beachSandbox.getBoundingClientRect();
        targetX = lightRect.left - sandboxRect.left + 25;
        targetY = lightRect.top - sandboxRect.top + 45;
      }

      // Move toward target
      const speed = 1.6 + Math.random() * 1.2;
      const dx = targetX - posX;
      const dy = targetY - posY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (posY <= 40) {
        // Reached the ocean!
        hatchlingsSaved++;
        txtHatchlingsSaved.textContent = `${hatchlingsSaved} / 20`;
        crawler.remove();
        clearInterval(crawlInterval);

        // Little splash particle at water line
        spawnScoreAlert(posX, 30, "💦 Safe!");
        return;
      }

      // If light drawing them off-screen
      if (activeLight && dist < 30) {
        // Lost inland
        crawler.remove();
        clearInterval(crawlInterval);
        beachFeedbackText.textContent = "💡 Some hatchlings wandered inland toward light!";
        return;
      }

      // Wiggle movement vector
      const waddle = Math.sin(Date.now() / 150) * 0.5;
      const stepX = (dx / dist) * speed + waddle;
      const stepY = (dy / dist) * speed;

      posX += stepX;
      posY += stepY;

      // Rotate towards movement vector
      const targetAngle = Math.atan2(stepY, stepX) * (180 / Math.PI) - 90;
      crawler.style.left = `${posX}px`;
      crawler.style.top = `${posY}px`;
      crawler.style.transform = `rotate(${targetAngle}deg)`;
    }, 50);
  }

  function checkOverlap(rect1, rect2) {
    return !(
      rect1.right < rect2.left + 5 ||
      rect1.left > rect2.right - 5 ||
      rect1.bottom < rect2.top + 5 ||
      rect1.top > rect2.bottom - 5
    );
  }

  function spawnScoreAlert(x, y, text) {
    const alert = document.createElement('div');
    alert.style.position = 'absolute';
    alert.style.left = `${x}px`;
    alert.style.top = `${y}px`;
    alert.style.color = '#52b788';
    alert.style.fontWeight = 'bold';
    alert.style.fontSize = '0.9rem';
    alert.style.pointerEvents = 'none';
    alert.style.zIndex = '100';
    alert.style.transition = 'all 0.8s ease-out';
    alert.textContent = text;
    
    beachSandbox.appendChild(alert);

    setTimeout(() => {
      alert.style.transform = 'translateY(-30px)';
      alert.style.opacity = '0';
    }, 10);

    setTimeout(() => alert.remove(), 900);
  }

  function endBeachPhase() {
    clearInterval(beachTimer);
    clearInterval(beachHazardsInterval);
    clearInterval(beachHatchInterval);

    if (hatchlingsSaved >= 5) {
      // Success! Populate migration success modal
      const pct = Math.round((hatchlingsSaved / 20) * 100);
      successSavedCount.textContent = `${hatchlingsSaved} / 20`;
      successSavedPct.textContent = `${pct}%`;

      if (hatchlingsSaved > 5) {
        // Exceeds baseline average, award goodies!
        startWithBonus = true;
        bonusInfoCard.classList.remove('hidden');
      } else {
        startWithBonus = false;
        bonusInfoCard.classList.add('hidden');
      }

      bonusTurtleName.textContent = turtleName;
      modals.migrationSuccess.classList.remove('hidden');
    } else {
      // Fail! Game over
      showGameOver(
        "Nest Vulnerability Too High!",
        `Only ${hatchlingsSaved} out of 20 hatchlings reached the ocean. In the wild, coastal lighting and trash block their path, making them prey for crabs and birds. Try again to clean the beach and keep it dark!`
      );
    }
  }

  // ==========================================
  // 7. OCEAN PHASE FUNCTIONS & CARE ACTIONS
  // ==========================================

  // Update HUD progress bars
  function updateStatBars() {
    // Health
    bars.health.style.width = `${stats.health}%`;
    texts.health.textContent = `${Math.round(stats.health)}%`;
    if (stats.health < 30) bars.health.classList.add('warning');
    else bars.health.classList.remove('warning');

    // Hunger
    bars.hunger.style.width = `${stats.hunger}%`;
    texts.hunger.textContent = `${Math.round(stats.hunger)}%`;

    // Joy
    bars.joy.style.width = `${stats.joy}%`;
    texts.joy.textContent = `${Math.round(stats.joy)}%`;

    // Clean
    bars.clean.style.width = `${stats.clean}%`;
    texts.clean.textContent = `${Math.round(stats.clean)}%`;
  }

  // Eye States Toggle
  function setEyeState(state) {
    Object.values(eyes).forEach(eye => eye.classList.add('hidden'));
    if (eyes[state]) {
      eyes[state].classList.remove('hidden');
    }
  }

  // Mouth States Toggle
  function setMouthState(state) {
    Object.values(mouths).forEach(mouth => mouth.classList.add('hidden'));
    if (mouths[state]) {
      mouths[state].classList.remove('hidden');
    }
  }

  // Dialog bubble
  function triggerThoughtBubble(text, duration = 3000, voice = null) {
    if (voice) playVoice(voice);
    thoughtText.textContent = text;
    thoughtBubble.classList.remove('hidden');
    
    // Position bubble directly over turtle
    const turtleRect = turtleContainer.getBoundingClientRect();
    const oceanRect = oceanPlaypen.getBoundingClientRect();
    const x = (turtleRect.left - oceanRect.left) + (turtleRect.width / 2) - 80;
    const y = (turtleRect.top - oceanRect.top) - 45;
    
    thoughtBubble.style.left = `${x}px`;
    thoughtBubble.style.top = `${y}px`;

    setTimeout(() => {
      thoughtBubble.classList.add('hidden');
    }, duration);
  }

  function getRandomLowStatThought() {
    if (stats.hunger < 40) {
      return turtleSpecies === 'green' ? "Need seagrass! 🌿" :
             turtleSpecies === 'loggerhead' ? "Need crabs! 🦀" : "Need jellyfish! 🪼";
    }
    if (stats.clean < 45) return "Shell feels itchy... 🧼";
    if (stats.joy < 40) return "Let's play! ⚽";
    return "Feeling weak... 🩹";
  }

  // Cleanliness Brushing Mini-game
  let brushCleaning = false;
  btnClean.addEventListener('click', () => {
    if (activeQte) return;

    if (cleaningGameOverlay.classList.contains('hidden')) {
      // Activate brushing
      cleaningGameOverlay.classList.remove('hidden');
      btnClean.classList.add('active');

      // Spawn brush near turtle shell (centered horizontally inside overlay)
      const initialOverlayRect = cleaningGameOverlay.getBoundingClientRect();
      cleaningBrush.style.left = `${initialOverlayRect.width / 2 - 30}px`;
      cleaningBrush.style.top = `${initialOverlayRect.height / 2}px`;

      let isDraggingBrush = false;
      let grabDX = 0, grabDY = 0;
      // Track direction so we can count discrete "scrubs". A scrub = one
      // back-and-forth swipe (direction reversal of horizontal motion) over
      // the shell. Each scrub adds 3% cleanliness; rubbing in one direction
      // doesn't keep adding indefinitely.
      let lastMoveX = null;
      let lastDir = 0;          // -1, 0, +1
      let accumulatedDist = 0;  // px traveled in current direction
      let lastScrubAt = 0;      // ms timestamp of last credited scrub
      const SCRUB_MIN_TRAVEL = 40; // px in one direction before reversal counts
      const SCRUB_COOLDOWN_MS = 220;

      const getPoint = (e) => {
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
      };

      const positionBrushAt = (clientX, clientY) => {
        const overlayRect = cleaningGameOverlay.getBoundingClientRect();
        const localX = clientX - overlayRect.left - grabDX;
        const localY = clientY - overlayRect.top - grabDY;
        cleaningBrush.style.left = `${localX}px`;
        cleaningBrush.style.top = `${localY}px`;
      };

      const brushStart = (e) => {
        e.preventDefault();
        isDraggingBrush = true;
        const { x, y } = getPoint(e);
        const brushRect = cleaningBrush.getBoundingClientRect();
        // If the user tapped inside the existing brush, preserve that grab
        // point. Otherwise center the brush under the finger so it snaps to
        // wherever they pressed.
        const tappedOnBrush =
          x >= brushRect.left && x <= brushRect.right &&
          y >= brushRect.top  && y <= brushRect.bottom;
        if (tappedOnBrush) {
          grabDX = x - brushRect.left;
          grabDY = y - brushRect.top;
        } else {
          grabDX = brushRect.width / 2;
          grabDY = brushRect.height / 2;
        }
        positionBrushAt(x, y);
        lastMoveX = x;
        lastDir = 0;
        accumulatedDist = 0;
      };

      const brushMove = (e) => {
        if (!isDraggingBrush) return;
        e.preventDefault();
        const { x, y } = getPoint(e);
        positionBrushAt(x, y);

        const brushRect = cleaningBrush.getBoundingClientRect();
        const turtleShell = document.getElementById('turtle-shell').getBoundingClientRect();
        const overlayRect = cleaningGameOverlay.getBoundingClientRect();
        const overShell = checkOverlap(brushRect, turtleShell);

        if (overShell) {
          // Visual feedback bubbles still trail the brush continuously
          if (Math.random() < 0.35) {
            spawnBrushBubble(x - overlayRect.left, y - overlayRect.top);
          }
        }

        // Track scrub direction (horizontal axis)
        if (lastMoveX !== null) {
          const dx = x - lastMoveX;
          const dir = dx > 0 ? 1 : dx < 0 ? -1 : 0;
          if (dir !== 0) {
            if (dir === lastDir) {
              accumulatedDist += Math.abs(dx);
            } else if (lastDir !== 0) {
              // Direction reversal — count this as a completed scrub if the
              // previous swipe traveled far enough and the brush was over
              // the shell at the moment of reversal.
              const now = Date.now();
              if (
                overShell &&
                accumulatedDist >= SCRUB_MIN_TRAVEL &&
                now - lastScrubAt > SCRUB_COOLDOWN_MS
              ) {
                stats.clean = Math.min(100, stats.clean + 3);
                lastScrubAt = now;
                updateStatBars();
                // Burst of bubbles to confirm the scrub registered
                for (let i = 0; i < 5; i++) {
                  spawnBrushBubble(
                    x - overlayRect.left + (Math.random() * 30 - 15),
                    y - overlayRect.top  + (Math.random() * 20 - 10)
                  );
                }
                if (stats.clean >= 100) {
                  cleaningGameOverlay.classList.add('hidden');
                  btnClean.classList.remove('active');
                  isDraggingBrush = false;
                  algaeSpots.classList.add('hidden');
                  setEyeState('happy');
                  triggerThoughtBubble("Squeaky clean! ✨");
                  stats.joy = Math.min(100, stats.joy + 10);
                  setTimeout(() => setEyeState('normal'), 2000);
                }
              }
              accumulatedDist = Math.abs(dx);
            } else {
              accumulatedDist = Math.abs(dx);
            }
            lastDir = dir;
          }
        }
        lastMoveX = x;
      };

      const brushEnd = () => {
        isDraggingBrush = false;
      };

      // Listen on the overlay itself so a tap anywhere starts cleaning, not
      // just a tap on the small brush handle.
      cleaningGameOverlay.onmousedown = brushStart;
      cleaningGameOverlay.ontouchstart = brushStart;
      cleaningGameOverlay.onmousemove = brushMove;
      cleaningGameOverlay.ontouchmove = brushMove;
      window.onmouseup = brushEnd;
      window.ontouchend = brushEnd;
      window.ontouchcancel = brushEnd;

    } else {
      cleaningGameOverlay.classList.add('hidden');
      btnClean.classList.remove('active');
    }
  });

  function spawnBrushBubble(x, y) {
    const bubble = document.createElement('div');
    bubble.className = 'dirt-particle';
    bubble.textContent = '🧼';
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.fontSize = '12px';
    bubble.style.pointerEvents = 'none';
    bubble.style.transition = 'all 0.5s ease-out';
    cleaningGameOverlay.appendChild(bubble);

    setTimeout(() => {
      bubble.style.transform = `translate(${Math.random()*40 - 20}px, -40px) scale(1.5)`;
      bubble.style.opacity = '0';
    }, 10);

    setTimeout(() => bubble.remove(), 550);
  }

  // Play Care Action — summons a species-specific playmate the turtle chases.
  // Tap the playmate as it darts around for bonus joy. Only one playmate at a
  // time. Replaces the old "spin in place" animation.
  let activePlaymate = null;

  btnPlay.addEventListener('click', () => {
    if (activeQte) return;
    if (activePlaymate) return; // already playing — don't stack
    summonPlaymate();
  });

  function getPlaymateForSpecies() {
    // Each species has a different ocean friend, chosen to avoid food-conflict
    // (e.g. leatherbacks don't get jellyfish here because they EAT those).
    switch (turtleSpecies) {
      case 'loggerhead':
        return {
          emoji: '🦐',
          name: 'shrimp friend',
          greeting: "A shrimp friend! Let's chase! 🦐",
          farewell: "Bye shrimp pal! 👋",
          color: 'rgba(255, 140, 120, 0.9)'
        };
      case 'leatherback':
        return {
          emoji: '🦑',
          name: 'squid buddy',
          greeting: "Glowing squid buddy! Deep dive! 🦑",
          farewell: "See you in the depths! 🌊",
          color: 'rgba(180, 130, 255, 0.95)'
        };
      case 'green':
      default:
        return {
          emoji: '🐢',
          name: 'turtle pal',
          greeting: "Another turtle! Let's play! 🐢",
          farewell: "Swim safe, friend! 💚",
          color: 'rgba(120, 200, 160, 0.95)'
        };
    }
  }

  function summonPlaymate() {
    const info = getPlaymateForSpecies();
    const mate = document.createElement('div');
    mate.className = 'sea-playmate';
    mate.textContent = info.emoji;
    oceanPlaypen.appendChild(mate);
    activePlaymate = mate;

    // Initial joy bump for triggering play
    stats.joy = Math.min(100, stats.joy + 15);
    updateStatBars();
    setEyeState('happy');
    setMouthState('normal');
    triggerThoughtBubble(info.greeting, 2200, 'letsPlay');

    // Random darting motion around the playpen
    const pen = oceanPlaypen.getBoundingClientRect();
    let mx = pen.width * 0.15;
    let my = pen.height * 0.4;
    let mvx = 2.4, mvy = 1.8;
    let highFives = 0;
    let elapsed = 0;
    const totalDuration = 7000; // 7 seconds of play
    const tickMs = 30;

    mate.style.left = `${mx}px`;
    mate.style.top  = `${my}px`;

    const swim = setInterval(() => {
      elapsed += tickMs;
      // Wander with gentle direction changes
      if (Math.random() < 0.08) {
        mvx = (Math.random() * 5) - 2.5;
        mvy = (Math.random() * 4) - 2;
      }
      mx += mvx;
      my += mvy;
      // Bounce off walls
      if (mx < 10) { mx = 10; mvx = Math.abs(mvx); }
      if (mx > pen.width - 50) { mx = pen.width - 50; mvx = -Math.abs(mvx); }
      if (my < 10) { my = 10; mvy = Math.abs(mvy); }
      if (my > pen.height - 50) { my = pen.height - 50; mvy = -Math.abs(mvy); }
      mate.style.left = `${mx}px`;
      mate.style.top  = `${my}px`;
      mate.style.transform = `scaleX(${mvx >= 0 ? 1 : -1})`;

      if (elapsed >= totalDuration) endPlaymate(info, highFives);
    }, tickMs);

    const tapPlaymate = (e) => {
      e.stopPropagation();
      highFives++;
      stats.joy = Math.min(100, stats.joy + 6);
      updateStatBars();
      spawnHeartParticle(
        (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX,
        (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY
      );
      // Bounce reaction
      mate.classList.add('high-five');
      setTimeout(() => mate.classList.remove('high-five'), 250);
      // Sometimes the playmate darts away after a tap
      mvx = (Math.random() * 6) - 3;
      mvy = (Math.random() * 5) - 2.5;
    };
    mate.addEventListener('click', tapPlaymate);
    mate.addEventListener('touchstart', tapPlaymate, { passive: true });

    // Store interval so endPlaymate can clear it
    mate._swim = swim;
  }

  function endPlaymate(info, highFives) {
    if (!activePlaymate) return;
    clearInterval(activePlaymate._swim);
    activePlaymate.classList.add('swimming-away');
    // Bonus joy proportional to engagement
    if (highFives > 0) {
      stats.joy = Math.min(100, stats.joy + Math.min(15, highFives * 2));
      updateStatBars();
    }
    triggerThoughtBubble(info.farewell, 1800, 'swimSafe');
    setTimeout(() => setEyeState('normal'), 1200);
    const m = activePlaymate;
    activePlaymate = null;
    setTimeout(() => m.remove(), 1200);
  }

  // Heal Care Action
  btnHeal.addEventListener('click', () => {
    if (activeQte) return;
    if (isSick) {
      isSick = false;
      stats.health = Math.min(100, stats.health + 30);
      setEyeState('happy');
      triggerThoughtBubble("All healed up! 💊");
      setTimeout(() => setEyeState('normal'), 2000);
    } else if (stats.health < 80) {
      stats.health = Math.min(100, stats.health + 20);
      triggerThoughtBubble("Applying salve... 🩹", 3000, 'applyingSalve');
    } else {
      triggerThoughtBubble("I feel great! 🐢");
    }
    updateStatBars();
  });

  // Feed Options Drawer Toggle
  btnFeed.addEventListener('click', () => {
    if (activeQte) return;
    feedDrawer.classList.toggle('hidden');
    btnFeed.classList.toggle('active');
  });

  // Feed selection
  document.querySelectorAll('.food-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const foodType = btn.getAttribute('data-food');
      feedDrawer.classList.add('hidden');
      btnFeed.classList.remove('active');

      spawnFoodDrifting(foodType);
    });
  });

  // Spawn Food in Ocean
  function spawnFoodDrifting(foodType) {
    const food = document.createElement('div');
    food.className = 'floating-item food-item';
    food.setAttribute('role', 'button');
    food.setAttribute('aria-label', `Tap to feed ${foodType}`);

    const emojis = {
      seagrass: '🌿',
      crabs: '🦀',
      jellyfish: '🪼'
    };

    food.textContent = emojis[foodType];

    // Spawn at random location near top
    const playpenWidth = oceanPlaypen.clientWidth;
    const x = Math.random() * (playpenWidth - 40) + 10;

    food.style.left = `${x}px`;
    food.style.top = '10px';

    floatingItemsContainer.appendChild(food);

    let posY = 10;
    let posX = x;
    let consumed = false;
    let chasingTurtle = false;

    const eatFood = () => {
      if (consumed) return;
      consumed = true;
      clearInterval(drift);
      food.classList.add('eating');
      setMouthState('eating');

      if (foodType === 'seagrass' && turtleSpecies === 'green') {
        stats.hunger = Math.min(100, stats.hunger + 30);
        stats.joy = Math.min(100, stats.joy + 10);
        triggerThoughtBubble("Yummy seagrass! 🌿", 3000, 'yummySeagrass');
        setEyeState('happy');
      } else if (foodType === 'crabs' && turtleSpecies === 'loggerhead') {
        stats.hunger = Math.min(100, stats.hunger + 30);
        stats.joy = Math.min(100, stats.joy + 10);
        triggerThoughtBubble("Crunchy crab! 🦀", 3000, 'crunchyCrab');
        setEyeState('happy');
      } else if (foodType === 'jellyfish' && turtleSpecies === 'leatherback') {
        stats.hunger = Math.min(100, stats.hunger + 30);
        stats.joy = Math.min(100, stats.joy + 10);
        triggerThoughtBubble("Soft jellyfish! 🪼", 3000, 'softJellyfish');
        setEyeState('happy');
      } else {
        stats.hunger = Math.min(100, stats.hunger + 12);
        stats.joy = Math.max(0, stats.joy - 15);
        triggerThoughtBubble("Yuck, not my favorite! 🤢");
        setEyeState('dizzy');
      }

      updateStatBars();
      setTimeout(() => {
        setMouthState('normal');
        setEyeState('normal');
        food.remove();
      }, 900);
    };

    // Tap food to send it directly to the turtle's mouth
    const tapHandler = (e) => {
      e.stopPropagation();
      if (consumed || chasingTurtle) return;
      chasingTurtle = true;
      food.classList.add('chasing');

      const oceanRect = oceanPlaypen.getBoundingClientRect();
      const headRect = document.getElementById('turtle-head').getBoundingClientRect();
      const targetX = (headRect.left - oceanRect.left) + headRect.width / 2 - 20;
      const targetY = (headRect.top - oceanRect.top) + headRect.height / 2 - 20;

      food.style.transition = 'left 0.45s cubic-bezier(.45,.05,.55,.95), top 0.45s cubic-bezier(.45,.05,.55,.95), transform 0.45s ease';
      food.style.left = `${targetX}px`;
      food.style.top = `${targetY}px`;
      food.style.transform = 'scale(1.25)';

      setTimeout(eatFood, 430);
    };
    food.addEventListener('click', tapHandler);
    food.addEventListener('touchstart', tapHandler, { passive: true });

    // Gravity drift downward
    const drift = setInterval(() => {
      if (currentState !== STATES.OCEAN || !food.parentNode) {
        clearInterval(drift);
        return;
      }
      if (chasingTurtle) return;

      posY += 1.5;
      // Gentle sideways sway so food is easier to tap and looks alive
      posX = x + Math.sin(posY / 30) * 18;
      food.style.top = `${posY}px`;
      food.style.left = `${posX}px`;

      // Passive collision with turtle head still feeds (lucky drift)
      const foodRect = food.getBoundingClientRect();
      const turtleHead = document.getElementById('turtle-head').getBoundingClientRect();
      if (checkOverlap(foodRect, turtleHead)) {
        eatFood();
        return;
      }

      if (posY > oceanPlaypen.clientHeight - 30) {
        clearInterval(drift);
        triggerThoughtBubble("Aw, I missed it! 😔", 1500);
        food.remove();
      }
    }, 30);
  }

  // Spawn Drifting Marine Debris (Plastic bags or real jelly)
  function spawnFloatingDebris() {
    const debris = document.createElement('div');
    debris.className = 'floating-item';
    
    // 70% chance of plastic bag, 30% chance of neutral floating seaweed/driftwood
    const isPlastic = Math.random() > 0.3;
    debris.textContent = isPlastic ? '🛍️' : '🪵';
    if (isPlastic) debris.style.filter = 'opacity(0.85)'; // Transparent bag look
    
    const playpenWidth = oceanPlaypen.clientWidth;
    const x = Math.random() * (playpenWidth - 40) + 10;
    
    debris.style.left = `${x}px`;
    debris.style.top = '10px';

    floatingItemsContainer.appendChild(debris);

    let posY = 10;
    const drift = setInterval(() => {
      if (currentState !== STATES.OCEAN || !debris.parentNode) {
        clearInterval(drift);
        return;
      }

      posY += 1.2;
      debris.style.top = `${posY}px`;

      // Check collision with head/mouth
      const debrisRect = debris.getBoundingClientRect();
      const turtleHead = document.getElementById('turtle-head').getBoundingClientRect();

      if (checkOverlap(debrisRect, turtleHead)) {
        clearInterval(drift);
        debris.remove();

        if (isPlastic) {
          // Turtle ate plastic bag!
          isSick = true;
          stats.health = Math.max(0, stats.health - 25);
          stats.joy = Math.max(0, stats.joy - 20);
          setEyeState('dizzy');
          setMouthState('sad');
          triggerThoughtBubble("Ate a bag... toxic! 🤢🛍️", 4000, 'ateBagToxic');
          updateStatBars();
          
          screens.ocean.classList.add('shake-element');
          setTimeout(() => {
            screens.ocean.classList.remove('shake-element');
            setEyeState('normal');
          }, 1500);

          checkGameOver();
        } else {
          // neutral driftwood bump
          stats.joy = Math.max(0, stats.joy - 5);
          triggerThoughtBubble("Bumped driftwood! 🪵");
        }
      }

      if (posY > oceanPlaypen.clientHeight - 30) {
        clearInterval(drift);
        debris.remove();
      }
    }, 40);

    // Tap to recycle plastic bag before turtle eats it!
    debris.addEventListener('click', () => {
      clearInterval(drift);
      debris.remove();
      if (isPlastic) {
        triggerThoughtBubble("Thanks for catching that bag! ♻️");
        stats.joy = Math.min(100, stats.joy + 5);
      }
    });
  }

  // ==========================================
  // 8. QTE CRITICAL HAZARDS (Nets, Boats, Sharks)
  // ==========================================
  function triggerQteHazard() {
    const hazardsList = ['net', 'boat', 'shark'];
    activeQte = hazardsList[Math.floor(Math.random() * hazardsList.length)];
    
    // Play warning pulse
    screens.ocean.classList.add('shake-element');
    setTimeout(() => screens.ocean.classList.remove('shake-element'), 500);

    if (activeQte === 'net') {
      triggerNetQte();
    } else if (activeQte === 'boat') {
      triggerBoatQte();
    } else if (activeQte === 'shark') {
      triggerSharkQte();
    }
  }

  // GHOST NET SWIPE QTE — each completed swipe (direction reversal) snaps
  // another strand of the net. 8 swipes required total. Net visibly breaks
  // as you progress.
  function triggerNetQte() {
    qteNet.classList.remove('hidden');
    setEyeState('dizzy');
    setMouthState('sad');

    const netGrid = document.querySelector('#qte-net-overlay .net-grid-graphics');
    if (netGrid) {
      while (netGrid.firstChild) netGrid.removeChild(netGrid.firstChild);
      netGrid.classList.remove('snapping');
      for (let i = 0; i < 16; i++) {
        const strand = document.createElement('span');
        strand.className = 'net-strand';
        netGrid.appendChild(strand);
      }
    }
    const TOTAL_SWIPES = 8;
    let swipes = 0;
    netSwipeFill.style.width = '0%';

    let isSwiping = false;
    let lastX = 0;
    let lastSwipeDir = 0;
    let travelInDir = 0;
    let lastCutAt = 0;
    const MIN_TRAVEL = 60;
    const CUT_COOLDOWN = 250;

    const handleSwipeStart = (e) => {
      isSwiping = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      lastX = clientX;
      lastSwipeDir = 0;
      travelInDir = 0;
    };

    const creditCut = () => {
      const now = Date.now();
      if (now - lastCutAt < CUT_COOLDOWN) return;
      lastCutAt = now;
      swipes++;
      const pct = (swipes / TOTAL_SWIPES) * 100;
      netSwipeFill.style.width = `${Math.min(100, pct)}%`;

      if (netGrid) {
        const strands = netGrid.querySelectorAll('.net-strand:not(.cut)');
        if (strands.length) {
          const idx = Math.floor(Math.random() * strands.length);
          strands[idx].classList.add('cut');
        }
        if (swipes >= TOTAL_SWIPES / 2) netGrid.classList.add('snapping');
      }

      if (swipes >= TOTAL_SWIPES) {
        resolveNetQte(true);
      }
    };

    const handleSwipeMove = (e) => {
      if (!isSwiping) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const dx = clientX - lastX;
      lastX = clientX;
      const dir = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      if (dir === 0) return;

      if (dir === lastSwipeDir) {
        travelInDir += Math.abs(dx);
      } else {
        if (lastSwipeDir !== 0 && travelInDir >= MIN_TRAVEL) creditCut();
        travelInDir = Math.abs(dx);
        lastSwipeDir = dir;
      }
    };

    const handleSwipeEnd = () => {
      if (travelInDir >= MIN_TRAVEL) creditCut();
      isSwiping = false;
      lastSwipeDir = 0;
      travelInDir = 0;
    };

    qteNet.onmousedown = handleSwipeStart;
    qteNet.ontouchstart = handleSwipeStart;
    qteNet.onmousemove = handleSwipeMove;
    qteNet.ontouchmove = handleSwipeMove;
    window.onmouseup = handleSwipeEnd;
    window.ontouchend = handleSwipeEnd;

    qteNet.timer = setTimeout(() => {
      resolveNetQte(false);
    }, 12000);
  }

  function resolveNetQte(success) {
    // Clear event listeners
    qteNet.onmousedown = null;
    qteNet.ontouchstart = null;
    qteNet.onmousemove = null;
    qteNet.ontouchmove = null;
    clearTimeout(qteNet.timer);

    qteNet.classList.add('hidden');
    activeQte = null;

    if (success) {
      stats.joy = Math.min(100, stats.joy + 15);
      setEyeState('happy');
      setMouthState('normal');
      triggerThoughtBubble("Cut free! Thank goodness! 🛡️");
    } else {
      // Failed net QTE
      stats.health = Math.max(0, stats.health - 40);
      stats.clean = Math.max(0, stats.clean - 25);
      setEyeState('dizzy');
      triggerThoughtBubble("Stressed in net... Drowning hazard! 🌊🕸️", 4000);
      
      screens.ocean.classList.add('shake-element');
      setTimeout(() => {
        screens.ocean.classList.remove('shake-element');
        setEyeState('normal');
      }, 1000);
    }
    updateStatBars();
    checkGameOver();
  }

  // BOAT STRIKE DIVE QTE
  function triggerBoatQte() {
    qteBoat.classList.remove('hidden');
    setEyeState('dizzy');

    // 4 seconds to click dive
    qteBoat.timer = setTimeout(() => {
      resolveBoatQte(false);
    }, 4500);
  }

  btnQteDive.onclick = () => {
    resolveBoatQte(true);
  };

  function resolveBoatQte(success) {
    clearTimeout(qteBoat.timer);
    qteBoat.classList.add('hidden');
    activeQte = null;

    if (success) {
      setEyeState('normal');
      // Dive animation
      turtleContainer.style.transform = 'translateY(150px) scale(0.6)';
      triggerThoughtBubble("Dived deep! Safe. 🌊");
      
      setTimeout(() => {
        turtleContainer.style.transform = 'none';
      }, 2000);
    } else {
      // Boat strike impact!
      stats.health = Math.max(0, stats.health - 45);
      setEyeState('dizzy');
      setMouthState('sad');
      triggerThoughtBubble("Propeller strike! Fatal wounds! 🚢💥", 4000, 'propellerStrike');
      
      screens.ocean.classList.add('shake-element');
      setTimeout(() => {
        screens.ocean.classList.remove('shake-element');
        setEyeState('normal');
      }, 1000);
    }
    updateStatBars();
    checkGameOver();
  }

  // SHARK SPOT SHELL-HIDE QTE
  function triggerSharkQte() {
    qteShark.classList.remove('hidden');
    isHidingInShell = false;

    // Automatic alarm reaction — turtle senses the predator and flinches into
    // an alert posture BEFORE the user reacts. Wide eyes, sad mouth, slight
    // pull toward shell.
    turtleContainer.classList.add('predator-alert');
    setEyeState('normal');
    setMouthState('sad');
    triggerThoughtBubble("Something's coming! 😨", 1800, 'somebodysComing');
    setTimeout(() => {
      // Stay in alert until QTE resolves; cleanup happens in resolveSharkQte
    }, 100);

    // Spawn Shark sprite swimming across screen
    const shark = document.createElement('div');
    shark.className = 'shark-graphic';
    shark.textContent = '🦈';
    shark.style.left = '-100px';
    shark.style.top = '140px';
    oceanPlaypen.appendChild(shark);

    // Animate shark movement
    let sharkX = -100;
    const sharkSwim = setInterval(() => {
      sharkX += 6;
      shark.style.left = `${sharkX}px`;

      if (sharkX > oceanPlaypen.clientWidth + 50) {
        clearInterval(sharkSwim);
        shark.remove();
      }
    }, 30);

    // 4.5 seconds to react
    qteShark.timer = setTimeout(() => {
      resolveSharkQte(sharkSwim, shark);
    }, 4500);
  }

  btnQteHide.onclick = () => {
    isHidingInShell = true;

    // Realistic sea turtle defensive posture — they CAN'T fully retract like land
    // turtles. They pull their head close to the shell, tuck flippers tight to
    // their body, and angle the shell toward the threat to take any hit on the
    // hardest armor.
    const head = document.getElementById('turtle-head');
    const flL = document.getElementById('flipper-left');
    const flR = document.getElementById('flipper-right');
    const flBL = document.getElementById('flipper-back-left');
    const flBR = document.getElementById('flipper-back-right');

    turtleContainer.classList.add('defensive-posture');
    head.style.transition = 'transform 0.35s ease-out';
    flL.style.transition = 'transform 0.35s ease-out';
    flR.style.transition = 'transform 0.35s ease-out';
    flBL.style.transition = 'transform 0.35s ease-out';
    flBR.style.transition = 'transform 0.35s ease-out';

    // Head pulled close to shell rim (not into it), tucked downward
    head.style.transform = 'translateY(12px) scale(0.85)';
    // Front flippers folded tight against the body
    flL.style.transform = 'translate(18px, 6px) rotate(35deg) scale(0.78)';
    flR.style.transform = 'translate(-18px, 6px) rotate(-35deg) scale(0.78)';
    // Rear flippers tucked in
    flBL.style.transform = 'translate(10px, -4px) scale(0.85)';
    flBR.style.transform = 'translate(-10px, -4px) scale(0.85)';

    setEyeState('sleeping'); // squinting / bracing
    setMouthState('normal');
    btnQteHide.textContent = "🛡️ Bracing — Shell First!";
  };

  function resolveSharkQte(swimInterval, sharkElement) {
    clearTimeout(qteShark.timer);
    clearInterval(swimInterval);
    if (sharkElement) sharkElement.remove();
    
    qteShark.classList.add('hidden');
    activeQte = null;

    // Reset turtle visuals
    const head = document.getElementById('turtle-head');
    const flL = document.getElementById('flipper-left');
    const flR = document.getElementById('flipper-right');
    const flBL = document.getElementById('flipper-back-left');
    const flBR = document.getElementById('flipper-back-right');
    head.style.transform = 'none';
    flL.style.transform = 'none';
    flR.style.transform = 'none';
    flBL.style.transform = 'none';
    flBR.style.transform = 'none';
    turtleContainer.classList.remove('defensive-posture');
    turtleContainer.classList.remove('predator-alert');
    btnQteHide.textContent = "🛡️ Brace (Shell First)";

    if (isHidingInShell) {
      stats.health = Math.max(0, stats.health - 8); // Minor shield bump damage
      stats.joy = Math.max(0, stats.joy - 15);
      setEyeState('normal');
      triggerThoughtBubble("Bitten shell, but okay! 🛡️🦈", 3000, 'bittenShell');
    } else {
      // Exposed shark bite
      stats.health = Math.max(0, stats.health - 50);
      stats.joy = Math.max(0, stats.joy - 40);
      setEyeState('dizzy');
      setMouthState('sad');
      triggerThoughtBubble("Predator attack! Deep bite! 🦈💥", 4000);

      screens.ocean.classList.add('shake-element');
      setTimeout(() => {
        screens.ocean.classList.remove('shake-element');
        setEyeState('normal');
      }, 1000);
    }
    
    isHidingInShell = false;
    updateStatBars();
    checkGameOver();
  }

  // ==========================================
  // 9. BEACHING / TOURIST SHIELD EVENT
  // ==========================================
  function initBeachingPhase() {
    beachingTurtleName.textContent = turtleName;
    beachingProgress = 0;
    beachingProgressFill.style.width = '0%';
    beachingProgressText.textContent = '0%';
    touristSpawnLayer.innerHTML = '';
    
    // Clear ocean active processes
    clearOceanLoops();
    
    // Spawning interval (Tourists walk in every 4 seconds)
    beachingTouristsInterval = setInterval(() => {
      if (currentState === STATES.BEACHING) {
        spawnTourist();
      }
    }, 3800);

    // Resting recovery tracker (Ticks up every 1.5 seconds if tourists are kept away)
    beachingInterval = setInterval(() => {
      // Check if any tourists are inside the 10-foot boundary ring
      const safeZone = document.querySelector('.turtle-zone-ring').getBoundingClientRect();
      const touristsList = document.querySelectorAll('.tourist-sprite');
      
      let isDisturbed = false;

      touristsList.forEach(tourist => {
        const touristRect = tourist.getBoundingClientRect();
        if (checkOverlap(safeZone, touristRect)) {
          isDisturbed = true;
          // Trigger camera flash
          triggerFlash(tourist);
        }
      });

      if (isDisturbed) {
        // Stress! Slow progress and minor health penalty
        stats.health = Math.max(10, stats.health - 1.5);
        beachingProgress = Math.max(0, beachingProgress - 2);
        updateStatBars();
        
        // Show stress thought
        setEyeState('sleeping');
        touristFactText.textContent = "⚠️ Disoriented by camera flash! Harassment stresses resting turtles.";
      } else {
        // Rest success increments
        beachingProgress = Math.min(100, beachingProgress + 5);
      }

      beachingProgressFill.style.width = `${beachingProgress}%`;
      beachingProgressText.textContent = `${beachingProgress}%`;

      if (beachingProgress >= 100) {
        resolveBeachingPhase(true);
      }
    }, 1500);
  }

  function spawnTourist() {
    const tourist = document.createElement('div');
    tourist.className = 'tourist-sprite';
    
    const touristEmojis = ['🧑‍🚀', '👩‍💼', '👨‍🎨', '🏃', '📸', '🤳'];
    tourist.innerHTML = `
      <span class="tourist-avatar">${touristEmojis[Math.floor(Math.random() * touristEmojis.length)]}</span>
      <div class="tourist-camera-flash"></div>
    `;

    const sandboxWidth = beachingSandbox.clientWidth;
    const sandboxHeight = beachingSandbox.clientHeight;

    // Spawn on random boundaries (Left, Right, Top)
    const side = Math.floor(Math.random() * 3);
    let startX = 0, startY = 0;

    if (side === 0) { // Left
      startX = -40;
      startY = Math.random() * (sandboxHeight - 200) + 50;
    } else if (side === 1) { // Right
      startX = sandboxWidth + 10;
      startY = Math.random() * (sandboxHeight - 200) + 50;
    } else { // Top
      startX = Math.random() * (sandboxWidth - 60) + 10;
      startY = -40;
    }

    tourist.style.left = `${startX}px`;
    tourist.style.top = `${startY}px`;
    touristSpawnLayer.appendChild(tourist);

    // Target the turtle center
    const targetX = sandboxWidth / 2 - 25;
    const targetY = sandboxHeight / 2 - 30;

    let posX = startX;
    let posY = startY;
    const speed = 0.5 + Math.random() * 0.4;

    const moveInterval = setInterval(() => {
      if (currentState !== STATES.BEACHING || !tourist.parentNode) {
        clearInterval(moveInterval);
        return;
      }

      const dx = targetX - posX;
      const dy = targetY - posY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < 40) {
        // Halted near turtle
        clearInterval(moveInterval);
      } else {
        posX += (dx / dist) * speed;
        posY += (dy / dist) * speed;
        tourist.style.left = `${posX}px`;
        tourist.style.top = `${posY}px`;
      }
    }, 40);

    // Repel Tourist Click
    tourist.addEventListener('click', () => {
      clearInterval(moveInterval);
      
      // Knockback animation
      tourist.style.transform = 'scale(0.8) translateY(-40px)';
      tourist.style.opacity = '0';
      tourist.style.transition = 'all 0.4s ease-out';

      // Display random educational fact
      touristFactText.textContent = CONSERVATION_FACTS[Math.floor(Math.random() * CONSERVATION_FACTS.length)];

      setTimeout(() => tourist.remove(), 400);
    });
  }

  function triggerFlash(touristElement) {
    const flash = touristElement.querySelector('.tourist-camera-flash');
    if (flash && !flash.classList.contains('flash-active')) {
      flash.classList.add('flash-active');
      setTimeout(() => flash.classList.remove('flash-active'), 800);
    }
  }

  function resolveBeachingPhase(success) {
    clearInterval(beachingInterval);
    clearInterval(beachingTouristsInterval);

    if (success) {
      stats.health = 100;
      stats.joy = Math.min(100, stats.joy + 20);
      isSick = false;
      
      alert("🐢 Rest complete! You successfully kept tourists away. The turtle returns safely to the ocean!");
      changeState(STATES.OCEAN);
    }
  }

  // ==========================================
  // 10. GAME OVER & PROGRESS RESET
  // ==========================================
  function checkGameOver() {
    if (stats.health <= 0) {
      clearOceanLoops();
      showGameOver(
        "Turtle Lost!",
        `${turtleName} has perished due to poor health, pollution ingestion, or predator attacks. In the wild, sea turtles struggle against boat collisions, trash, and fishing nets. Keep playing to learn how we can defend them!`
      );
    }
  }

  function showGameOver(title, desc) {
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('gameover-desc').textContent = desc;
    document.getElementById('gameover-name').textContent = turtleName;
    document.getElementById('gameover-age').textContent = `${turtleAge} Days`;
    modals.gameover.classList.remove('hidden');
  }

  function resetGameSession() {
    // Clear Local Storage
    localStorage.removeItem('tortugotchi_save');
    
    // Clear variables
    turtleAge = 0;
    stats = { health: 100, hunger: 80, joy: 80, clean: 100 };
    isSick = false;
    isHidingInShell = false;

    // Reset modals
    modals.gameover.classList.add('hidden');
    modals.rename.classList.add('hidden');
    modals.migrationSuccess.classList.add('hidden');
    
    changeState(STATES.START);
  }

  // ==========================================
  // 11. BUTTON ATTACHMENTS & MODALS
  // ==========================================

  // Start Conservation Game
  btnStartGame.addEventListener('click', () => {
    turtleName = sanitizeName(inputTurtleNameStart.value);
    changeState(STATES.BEACH);
  });

  // Fact Modals
  btnShowFactsMain.addEventListener('click', () => modals.facts.classList.remove('hidden'));
  btnCloseFacts.addEventListener('click', () => modals.facts.classList.add('hidden'));
  btnCloseFactsBottom.addEventListener('click', () => modals.facts.classList.add('hidden'));

  // Dismiss beach tutorial
  btnDismissBeachTut.addEventListener('click', () => {
    document.getElementById('beach-tutorial-overlay').classList.add('hidden');
  });

  // Migration Success Continue Action — the turtle was already named at the
  // start, so head straight into the ocean.
  btnMigrationContinue.addEventListener('click', () => {
    modals.migrationSuccess.classList.add('hidden');
    changeState(STATES.OCEAN);
  });

  // Rename Turtle Action
  btnRenameTurtle.addEventListener('click', () => {
    document.getElementById('input-turtle-name').value = turtleName;
    modals.rename.classList.remove('hidden');
  });

  btnSaveRename.addEventListener('click', () => {
    const raw = document.getElementById('input-turtle-name').value;
    turtleName = sanitizeName(raw);
    
    modals.rename.classList.add('hidden');
    
    // Save state
    saveProgress();
    
    // Go to Ocean View
    changeState(STATES.OCEAN);
  });

  // Restart after gameover
  btnRestartGame.addEventListener('click', () => {
    resetGameSession();
  });

  // ==========================================
  // TURTLE TOUCH INTERACTION (rubs, tickles, pats)
  // ==========================================
  let lastTickleAt = 0;
  let rubCount = 0;
  let rubTimer = null;

  function handleTurtleTouch(e) {
    if (activeQte || currentState !== STATES.OCEAN) return;
    if (cleaningGameOverlay && !cleaningGameOverlay.classList.contains('hidden')) return;

    const now = Date.now();
    rubCount++;

    // Gentle joy per rub, cap to avoid spamming
    if (now - lastTickleAt > 120) {
      stats.joy = Math.min(100, stats.joy + 2);
      updateStatBars();
      lastTickleAt = now;
    }

    // Heart particle from touch point
    let touchX, touchY;
    if (e.touches && e.touches[0]) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    } else {
      touchX = e.clientX;
      touchY = e.clientY;
    }
    spawnHeartParticle(touchX, touchY);

    // Happy face + wiggle
    turtleContainer.classList.add('being-tickled');
    setEyeState('happy');
    setMouthState('normal');

    clearTimeout(rubTimer);
    rubTimer = setTimeout(() => {
      turtleContainer.classList.remove('being-tickled');
      setEyeState('normal');
      if (rubCount >= 3) {
        const tickleThoughts = [
          { text: "Hehe that tickles! ✨", voice: 'hehe' },
          { text: "More please! 💕",      voice: 'morePlease' },
          { text: "Best human ever! 🥰",  voice: 'bestHuman' },
          { text: "Hehehehe! 😆",         voice: 'heehee' }
        ];
        const pick = tickleThoughts[Math.floor(Math.random() * tickleThoughts.length)];
        triggerThoughtBubble(pick.text, 1800, pick.voice);
        stats.joy = Math.min(100, stats.joy + 5);
        updateStatBars();
      }
      rubCount = 0;
    }, 600);
  }

  turtleContainer.addEventListener('pointerdown', handleTurtleTouch);
  turtleContainer.addEventListener('pointermove', (e) => {
    if (e.buttons === 1 || e.pointerType === 'touch') handleTurtleTouch(e);
  });

  function spawnHeartParticle(clientX, clientY) {
    const oceanRect = oceanPlaypen.getBoundingClientRect();
    const heart = document.createElement('div');
    heart.className = 'tickle-heart';
    heart.textContent = ['💕', '✨', '💖', '⭐'][Math.floor(Math.random() * 4)];
    heart.style.left = `${clientX - oceanRect.left - 10}px`;
    heart.style.top = `${clientY - oceanRect.top - 10}px`;
    oceanPlaypen.appendChild(heart);
    setTimeout(() => heart.remove(), 900);
  }

  // ==========================================
  // IDLE BEHAVIORS — turtle does adorable things on its own
  // ==========================================
  const IDLE_BEHAVIORS = ['blink', 'bubbles', 'flap', 'lookAround', 'roll', 'yawn', 'muse'];

  function triggerIdleBehavior() {
    // Don't interrupt if turtle is being interacted with or unhappy/sick
    if (turtleContainer.classList.contains('being-tickled')) return;
    if (turtleContainer.classList.contains('idle-active')) return;
    if (isSick) return;

    const behavior = IDLE_BEHAVIORS[Math.floor(Math.random() * IDLE_BEHAVIORS.length)];
    turtleContainer.classList.add('idle-active');

    const cleanup = (ms) => setTimeout(() => turtleContainer.classList.remove('idle-active'), ms);

    switch (behavior) {
      case 'blink':
        setEyeState('sleeping');
        setTimeout(() => setEyeState('normal'), 250);
        cleanup(400);
        break;
      case 'bubbles':
        for (let i = 0; i < 4; i++) {
          setTimeout(() => spawnTurtleBubble(), i * 150);
        }
        cleanup(900);
        break;
      case 'flap':
        turtleContainer.classList.add('idle-flap');
        setTimeout(() => turtleContainer.classList.remove('idle-flap'), 1200);
        cleanup(1300);
        break;
      case 'lookAround':
        turtleContainer.classList.add('idle-look');
        setTimeout(() => turtleContainer.classList.remove('idle-look'), 1600);
        cleanup(1700);
        break;
      case 'roll':
        turtleContainer.classList.add('idle-roll');
        setEyeState('happy');
        setTimeout(() => {
          turtleContainer.classList.remove('idle-roll');
          setEyeState('normal');
        }, 1400);
        cleanup(1500);
        break;
      case 'yawn':
        setMouthState('eating');
        setEyeState('sleeping');
        setTimeout(() => {
          setMouthState('normal');
          setEyeState('normal');
        }, 800);
        cleanup(900);
        break;
      case 'muse':
        triggerThoughtBubble("Another day in the deep blue... 🌊", 2600, 'deepBlue');
        cleanup(2700);
        break;
    }
  }

  function spawnTurtleBubble() {
    const turtleRect = turtleContainer.getBoundingClientRect();
    const oceanRect = oceanPlaypen.getBoundingClientRect();
    const bubble = document.createElement('div');
    bubble.className = 'turtle-bubble';
    const cx = (turtleRect.left - oceanRect.left) + turtleRect.width / 2 + (Math.random() * 20 - 10);
    const cy = (turtleRect.top - oceanRect.top) + 30;
    bubble.style.left = `${cx}px`;
    bubble.style.top = `${cy}px`;
    bubble.style.width = `${6 + Math.random() * 10}px`;
    bubble.style.height = bubble.style.width;
    oceanPlaypen.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2400);
  }

  function spawnAmbientBubble() {
    const oceanRect = oceanPlaypen.getBoundingClientRect();
    const bubble = document.createElement('div');
    bubble.className = 'ambient-bubble';
    bubble.style.left = `${Math.random() * (oceanRect.width - 10)}px`;
    bubble.style.bottom = '-10px';
    const size = 4 + Math.random() * 8;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.animationDuration = `${4 + Math.random() * 3}s`;
    oceanPlaypen.appendChild(bubble);
    setTimeout(() => bubble.remove(), 7500);
  }

  // Initialize: attempt to load progress
  const hasSave = loadProgress();
  if (hasSave && turtleAge > 0) {
    // Jump straight to Ocean Phase
    changeState(STATES.OCEAN);
  } else {
    // Start screen
    changeState(STATES.START);
  }
});
