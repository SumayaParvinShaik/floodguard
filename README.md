# FloodGuard 🌊
### Global Open-Source Flood Warning, Voice Evacuation & Refuge Guidance System

FloodGuard is a production-quality, open-source disaster-tech web application that warns people about impending flash floods and river surges **anywhere in the world**, in their **native language**, by **synthesized voice and acoustic sirens**, calculating the **nearest safe high-ground refuge** and the estimated travel time to reach it.

---

## 🚨 Honest Safety Disclaimers & Operational Limits
Disaster response demands absolute transparency. Before relying on FloodGuard in critical situations, acknowledge these fundamental technical realities:
1. **Forecasts vs. Official Government Directives:** Open-Meteo GloFAS river discharge models and meteorological precipitation forecasts are mathematical hydrologic predictions. **They do not replace evacuation orders issued by local civil defense authorities or police.** When official evacuation mandates conflict with model forecasts, **always obey local disaster authorities immediately.**
2. **Cell Broadcast vs. Web Application Reach:** A browser or PWA can **only** deliver notifications to smartphones that have navigated to the app or installed the web manifest. **No web app can unilaterally push alerts to unknown handsets without installation.** To reach all devices in a 50 km disaster zone, emergency officials must take the standard **CAP 1.2 XML** generated in FloodGuard's Authorities Console and transmit it to a telecom **Cell Broadcast Centre (CBC)** or Google Android Emergency Alerts.
3. **OpenStreetMap Data Completeness:** Safe shelters, schools, and hospitals are queried dynamically from OpenStreetMap Overpass API. In remote rural areas, community shelters may be unmapped. When no verified shelter is located within 15 km, FloodGuard honestly instructs users to execute **vertical evacuation** (move immediately to upper storeys, reinforced concrete roofs, or highest local topography) rather than attempting perilous journeys through flooded roads.

---

## 🛠️ Complete Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Core Client** | React 18, Vite 5, TypeScript | Reactive, strict-typed single-page application |
| **Styling & A11y** | Tailwind CSS, Lucide Icons | Responsive mobile-first UI, WCAG AA contrast, large-text & simple-language modes |
| **Mapping & Routing** | Leaflet, OpenStreetMap | Offline tile caching, interactive danger geofencing, dynamic flood avoidance polyline |
| **Hydrology & Weather** | Open-Meteo GloFAS, ECMWF Weather, Elevation API | 100% free, zero-key global river discharge (past 30d + 7d forecast), 24h precipitation, elevation deltas |
| **Place & Geocoding** | BigDataCloud Client Reverse Geocode & Open-Meteo | Zero-key administrative location identification |
| **Safe Shelters** | OpenStreetMap Overpass Multi-Mirror API | Resilient failover queries for emergency shelters, schools, hospitals, and assembly points |
| **Audio & Voice** | Web Audio API + SpeechSynthesis | Synthetic 800–1200Hz siren tone, haptic vibration cadence, offline multilingual spoken alerts |
| **Hardware Ingestion**| Web Serial (USB) & Web Bluetooth | Direct telemetry ingestion from ESP32 river gauge with sub-second local alarm trigger |
| **Offline Shell** | Service Worker + CacheStorage PWA | Full offline capability for emergency helplines, shelters, audio sirens, and translations |
| **Interoperability** | OASIS CAP 1.2 XML Builder | Global standard emergency alert payloads for telecom Cell Broadcast and Android WEA |
| **Hardware Firmware**| ESP32 NodeMCU + JSN-SR04T | Waterproof ultrasonic sensor, median filter, GSM SMS module, LoRa, active piezo alarm |
| **Optional Proxy** | Node.js / Express (/server) | Cloud Run / Firebase proxy for Gemini API keys and Twilio SMS gateway |

---

## 📂 Complete File Tree

```
floodguard/
├── .github/
│   └── workflows/
│       └── pages.yml                # Automated GitHub Pages CI/CD deployment
├── docs/
│   ├── ARCHITECTURE.md              # Detailed disaster-tech engineering architecture
│   └── TEST_PLAN.md                 # Global QA test plan (Vijayawada, Kathmandu, Dhaka, etc.)
├── firmware/
│   └── esp32_floodguard.ino         # ESP32 ultrasonic water gauge, GSM SMS, & serial telemetry
├── public/
│   ├── favicon.svg                  # Vector flood beacon icon
│   ├── manifest.json                # PWA web manifest
│   └── sw.js                        # Service Worker caching offline shell & assets
├── server/
│   ├── index.js                     # Optional Cloud Run / Firebase proxy for Gemini & Twilio
│   └── package.json                 # Server proxy dependencies
├── src/
│   ├── api/
│   │   ├── gemini.ts                # Dynamic language selection & situational AI summarizer
│   │   ├── geocoding.ts             # BigDataCloud reverse geocode & Open-Meteo search
│   │   ├── openMeteo.ts             # Batched GloFAS river discharge, rain & elevation
│   │   └── osmOverpass.ts           # Multi-mirror Overpass shelter queries
│   ├── audio/
│   │   ├── siren.ts                 # Web Audio dual-tone oscillating siren generator
│   │   └── speech.ts                # SpeechSynthesis voice alerts, voice check & auto-repeat
│   ├── components/
│   │   ├── AuthoritiesModal.tsx     # CAP 1.2 XML exporter & telecom broadcast payload
│   │   ├── ChecklistModal.tsx       # Offline emergency go-bag & first-aid guide cards
│   │   ├── CommunityModal.tsx       # Crowd-sourced hazard reports with confidence scoring
│   │   ├── CompassDirectionCard.tsx # Device orientation compass needle pointing to refuge
│   │   ├── FamilySafetyModal.tsx    # Family status check-in & shareable safety links
│   │   ├── FirstRunWizard.tsx       # 2-step onboarding wizard (location + language)
│   │   ├── LanguageModal.tsx        # Multilingual picker with search & RTL support
│   │   ├── Map.tsx                  # Leaflet map with hazard zones and evacuation routing
│   │   ├── SensorsModal.tsx         # Web Serial connector, live gauge & slider simulator
│   │   ├── SettingsModal.tsx        # Accessibility, thresholds, shelter overrides, data wipe
│   │   └── SetupModal.tsx           # First-run Gemini key manager with validation test
│   ├── data/
│   │   └── helplines.ts             # Global emergency & disaster helpline directory
│   ├── i18n/
│   │   ├── languages.ts             # Regional language resolver & BCP47 mapping
│   │   └── translations.ts          # Offline translation dictionaries (12 languages)
│   ├── logic/
│   │   ├── alertText.ts             # Factual 40-60 word emergency text generator
│   │   ├── cap.ts                   # OASIS CAP 1.2 standard XML builder
│   │   ├── distance.ts              # Haversine distance, bearing, ring generator & travel times
│   │   ├── risk.ts                  # Multi-tiered GloFAS discharge risk & anti-fatigue engine
│   │   └── shelter.ts               # Elevation delta analysis, flood avoidance & vertical refuge
│   ├── sensors/
│   │   └── index.ts                 # Web Serial API driver & interactive demo simulator
│   ├── types/
│   │   └── index.ts                 # Strict TypeScript data models and interfaces
│   ├── App.tsx                      # Primary mobile-first disaster UI
│   ├── index.css                    # Tailwind directives and Leaflet styling
│   └── main.tsx                     # React application entry point
├── tests/
│   ├── distance.test.ts             # Haversine, bearing, and travel time tests
│   ├── language.test.ts             # Regional language selection & RTL validation
│   ├── risk.test.ts                 # GloFAS discharge ratios, geofences & anti-fatigue tests
│   └── shelter.test.ts              # Higher ground filtering & vertical evacuation tests
├── .env.example                     # Environment configuration reference
├── .gitignore                       # Git exclusion rules
├── index.html                       # HTML5 entry with fonts, PWA meta, and Service Worker
├── LICENSE                          # MIT License
├── package.json                     # NPM dependencies and scripts
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind disaster color palette & animations
├── tsconfig.json                    # Strict TypeScript configuration
└── vite.config.ts                   # Relative base for GitHub Pages and AI Studio
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js (version 18 or newer)
- npm or pnpm

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/your-username/floodguard.git
cd floodguard

# 2. Install dependencies
npm install

# 3. Run unit tests
npm test

# 4. Start local development server
npm run dev
```
Navigate to `http://localhost:3000` in your web browser.

---

## ⚡ Running in Google AI Studio & Antigravity

### In Google AI Studio Build
1. Import or open the `floodguard` folder directly in Google AI Studio Build.
2. AI Studio automatically injects your active Gemini API key into `import.meta.env.VITE_GEMINI_API_KEY`.
3. If no key is configured in the environment, FloodGuard displays a friendly setup notice and runs seamlessly using its **100% free offline algorithms and regional translation dictionaries**.

### In Google Antigravity IDE
1. Open the workspace containing `floodguard`.
2. Antigravity IDE recognizes Vite and TypeScript automatically.
3. Run `npm run dev` to launch the dev server with hot-reload and real-time inspector.

---

## 🌐 Deploying to GitHub Pages Step-by-Step

FloodGuard is configured with a relative base path (`base: './'`) in `vite.config.ts`, making static deployments to GitHub Pages effortless:

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of FloodGuard"
   git remote add origin https://github.com/<your-username>/floodguard.git
   git branch -M main
   git push -u origin main
   ```
2. **Enable GitHub Pages:**
   - In your GitHub repository, navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. **Automated Pipeline:**
   - The included workflow `.github/workflows/pages.yml` will automatically build the static PWA, execute unit tests, and publish the site to `https://<your-username>.github.io/floodguard/`.

---

## 🔌 Hardware Sensor Wiring & Bill of Materials (BOM)

FloodGuard includes autonomous ESP32 firmware in `firmware/esp32_floodguard.ino` for rapid river rise monitoring.

### Parts List
- **Microcontroller:** ESP32 NodeMCU / ESP32-WROOM-32 (approx. $4 USD)
- **Waterproof Ultrasonic Sensor:** JSN-SR04T 2.0 with separate waterproof probe ($6 USD)
- **Acoustic Alarm:** Active 5V Piezo Buzzer / Siren ($1 USD)
- **Cellular Backup (No Internet):** SIM800L GPRS / GSM Module + microSIM ($5 USD)
- **Power Source:** 3.7V 18650 Li-Ion Cell + TP4056 Solar Charge Controller ($4 USD)
- **Enclosure:** IP67 Waterproof Electrical Junction Box ($3 USD)

### Pinout Connections
| Component Pin | ESP32 GPIO | Description |
|---|---|---|
| JSN-SR04T `TRIG` | GPIO 5 | Ultrasonic pulse trigger |
| JSN-SR04T `ECHO` | GPIO 18 | Echo pulse duration measurement |
| Active Buzzer `+` | GPIO 19 | High-decibel local warning siren |
| SIM800L `TX` | GPIO 16 (RX2) | Hardware UART2 receive |
| SIM800L `RX` | GPIO 17 (TX2) | Hardware UART2 transmit |
| Battery Divider | GPIO 34 (ADC) | 2:1 resistive divider for battery % |

### Telemetry Stream
Connect the ESP32 to a laptop or Android smartphone via USB OTG. The firmware streams standardized telemetry:
```
LEVEL_CM=184.2;RATE_CM_MIN=3.1;STATE=PREPARE;BATTERY=92;ID=FG-GAUGE-01
```
Open **Menu** > **River Sensors** in FloodGuard and click **Connect USB / Web Serial** to establish sub-second local alerts with no internet connection.

---

## 🔒 Security & Privacy Notes
- **Zero Tracker Guarantee:** FloodGuard contains no Google Analytics, telemetry beacons, or third-party tracking scripts.
- **Client-Side Key Storage:** Any Gemini API key pasted into the Setup dialog remains exclusively inside `localStorage` on the client device. It is never transmitted to external servers.
- **Data Erasure:** Tap **Menu** > **Settings** > **Privacy** > **Delete My Data** at any time to purge all local caches, check-ins, and alert histories.

---

## 📄 License
FloodGuard is licensed under the terms of the **MIT License**. See `LICENSE` for details.
