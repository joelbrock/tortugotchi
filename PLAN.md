# Implementation Plan - Tortugotchi (Sea Turtle PWA)

Create a highly polished, responsive mobile Progressive Web App (PWA) called **Tortugotchi**. The game raised awareness of sea turtle conservation by making the player responsible for nesting eggs, hatchlings, an ocean-going juvenile turtle, and protecting it from human-made and natural hazards.

## User Review Required

> [!IMPORTANT]
> **Aesthetic Goal:** The app will use vanilla CSS with a premium glassmorphic dark UI, sunset/night gradients for the beach phase, and a bioluminescent/light-ray deep teal theme for the ocean phase. The turtle itself will be rendered as an interactive SVG containing customizable elements (custom name, facial expressions, swimming animations) rather than static or low-quality PNGs.

> [!NOTE]
> **PWA Support:** The application will be a fully-functional PWA that can be installed on iOS/Android. It will include a service worker for offline play and asset caching, and support responsive viewport sizes locked to a phone aspect ratio with modern desktop padding.

## Proposed Changes

We will construct the project in the workspace `/opt/homebrew/var/www/tortugotchi`.

### Configuration & PWA Assets

#### [NEW] [manifest.json](file:///opt/homebrew/var/www/tortugotchi/manifest.json)
- Define metadata for installation (app name: `Tortugotchi`, theme color, display mode: `standalone`).
- Specify sizes for icons: `192x192` and `512x512`.

#### [NEW] [sw.js](file:///opt/homebrew/var/www/tortugotchi/sw.js)
- A lightweight, reliable Service Worker to cache assets (`index.html`, `style.css`, `app.js`, sounds/images) for fast load speeds and true offline playability.

### Core Structure

#### [NEW] [index.html](file:///opt/homebrew/var/www/tortugotchi/index.html)
- Define a single-page app layout with three primary game views/states managed by JavaScript:
  1. **Start Screen:** Onboarding screen explaining the conservation mission, choosing a species (e.g. Green Sea Turtle vs. Loggerhead Sea Turtle), and initiating the nest phase.
  2. **Nest & Hatchling Stage:** Interactive night beach view. Guarding the nest from crabs, birds, filling holes, turning off streetlights, and getting the hatchlings to the water.
  3. **Ocean Care Stage:** Floating deep sea environment. Feeding, playing, cleaning shell, avoiding plastic bags (mimicking jellyfish), dodging motorboats, and surviving shark encounters.
  4. **Beaching Event:** Occasional alert view. The turtle beaches, and the player must ward off ignorant selfie-seeking tourists while asserting NOAA's 10-foot boundary laws.
- Implement HTML5 semantic elements and SEO tags (`description`, `title`, viewport adjustments).

#### [NEW] [style.css](file:///opt/homebrew/var/www/tortugotchi/style.css)
- Implement a modern color system (teal, deep ocean blues, soft sandy gold, coral accent colors).
- Use CSS Variables for theme control.
- Apply modern CSS styling:
  - Glassmorphic panels (`backdrop-filter: blur(10px) saturate(180%)`).
  - Flex/Grid layouts optimized for mobile-first viewport dimensions (capped aspect ratios on desktop to emulate a mobile screen).
  - Swimming keyframe animations for the SVG sea turtle (flipper strokes, head bobs).
  - Floating animations for underwater debris (plastic bags, nets, jellyfish).
  - Shake effects for damage and light pulses for night hazards.

#### [NEW] [app.js](file:///opt/homebrew/var/www/tortugotchi/app.js)
- Build a custom clientside Game State Machine:
  - **`STATE_START`**: Title screen, species select, instruction logs.
  - **`STATE_NEST`**: Nest health counter, hazard generator (predator crabs, deep beach holes, light distractions). Timer counts down to hatching. Hatchlings crawl to the ocean.
  - **`STATE_OCEAN`**: Core Tamagotchi care cycle. Loop monitors Stats (`Hunger`, `Happiness`, `Shell Cleanliness`, `Health`).
  - **`STATE_BEACHING`**: Triggers occasionally. Spawns tourists entering the safe zone. Tapping tourists drives them away and displays quick conservation/legal facts.
- **Interactivity handlers**:
  - Dragging to fill holes.
  - Tapping to turn off lights/scare crabs.
  - Feeding: Seagrass/crabs (based on species) and avoiding floating plastic bags.
  - Shell cleaning: Drag-to-brush mini-game.
  - Boat Alarm: Quick-time-event "Dive" button.
  - Shark Alarm: Quick-time-event "Retract into Shell" or "Hide in Reef" button.
  - Stats decrease over time; alerts occur when status is low.
- LocalStorage integration to save the turtle's progress (age, name, species, score).

### Assets Creation

We will generate beautiful SVG files or use the `generate_image` tool to construct a gorgeous logo/app icon (`icon-192.png` and `icon-512.png`). The primary characters and visual elements (turtle, sharks, crabs, trash, jellyfish, tourists) will be generated as custom SVG elements or inline SVGs directly inside the application files for crisp rendering, interactive state alterations, and high performance.

---

## Science & Conservation Facts Integrated
The game will highlight the following realistic conservation elements through status warnings, events, and educational overlays:
1. **Light Disorientation:** Artificial lights cause hatchlings to crawl inland, exhausting their energy and leaving them exposed to land predators or cars.
2. **Marine Plastic Mimicry:** Plastic bags resemble jellyfish floating in currents. Ingesting plastic causes gut blockages and false satiety, leading to starvation.
3. **Ghost Gear:** Discarded commercial fishing nets tangle sea turtles, preventing them from surfacing to breathe, causing drowning.
4. **Lawful Distance:** Under the Endangered Species Act (ESA) and NOAA regulations, tourists must stay at least 10 feet (3 meters) away from sea turtles on beaches. Crowding and touching stress turtles, and flash photography disorients them.

---

## Verification Plan

### Automated/Code Quality Checks
- Run `./bin/brew typecheck` (Wait, this is an empty workspace not related to Homebrew Ruby code directly, but we will make sure our JavaScript code is lint-free, follows best practices, has no syntax errors, and validates locally. If there are any Ruby tools in the repository, we can ignore them as we are creating a standalone HTML PWA).
- Validate HTML semantics and CSS standards.

### Manual Verification
- Launch a local developer server using a simple python/node server to view and play the game in the browser.
- Verify responsive layout works seamlessly on mobile viewports (simulated Chrome responsive view) and desktop views.
- Test PWA manifest compliance and verify the service worker registers successfully.
- Manually play through all three stages:
  - Guarding the eggs and hatchlings.
  - Feeding the turtle, brushing shell, avoiding plastic debris, diving under boat propellers, hiding from sharks.
  - Driving selfie-seeking tourists back to the 10-foot boundary.
