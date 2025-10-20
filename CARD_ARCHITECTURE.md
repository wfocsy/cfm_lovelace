# 🎨 CFM Manager Card - Architektúra Terv

**Verzió:** v2.0.0 (FÁZIS 1 KÉSZ ✅)
**Jelenlegi:** v1.0.1 (Teszt kártya - deprecated)
**Következő:** v2.1.0 (Fázis 2: PRE-START UI)

---

## 🎯 CÉL: Production-Ready Lovelace Card

### Követelmények

1. **YAML-mentes működés** - Minden automatikus (07:00 napi mentés)
2. **Dinamikus UI** - Cycle Manager választás dropdown-ból
3. **Többállapotú kártya** - Pre-start → Active → Closed
4. **Automatikus időzítők** - JavaScript-ben (NEM YAML!)
5. **Natív HA entitások** - sensor.manager_X_* használata

---

## 🗂️ FÁJL STRUKTÚRA (Tervezett)

```
HACS/
├── dist/
│   └── cfm-manager-card.js         # Compiled card (production)
├── src/                            # ÚJ - Fejlesztési source fájlok
│   ├── card-main.js                # Fő card osztály
│   ├── card-config.js              # Config editor
│   ├── states/                     # Állapotok
│   │   ├── pre-start-view.js       # "Ciklus Indítás" gomb
│   │   ├── active-cycle-view.js    # Aktív ciklus dashboard
│   │   └── closed-cycle-view.js    # Lezárt ciklus összefoglaló
│   ├── components/                 # UI komponensek
│   │   ├── cycle-start-form.js     # Ciklus indítás form
│   │   ├── daily-data-display.js   # Napi adatok megjelenítés
│   │   ├── shipping-modal.js       # Elszállítás popup
│   │   └── mortality-modal.js      # Elhullás popup
│   ├── services/                   # Backend kommunikáció
│   │   ├── ha-service-caller.js    # HA service call wrapper
│   │   └── scheduler.js            # Automatikus időzítők (07:00)
│   └── styles/
│       └── card-styles.js          # CSS styles
│
├── README.md                       # HACS dokumentáció
├── hacs.json                       # HACS metadata
└── info.md                         # HACS info oldal
```

---

## 🔄 CARD ÁLLAPOTOK (State Machine)

### 1️⃣ PRE-START (Várakozó)

**Feltétel:**
- `sensor.manager_X_cycle_status` = "waiting"
- NINCS aktív ciklus

**UI:**
```
┌─────────────────────────────────────┐
│  Istálló 1 - Ciklus Kezelő          │
├─────────────────────────────────────┤
│                                     │
│  Státusz: Várakozik ciklus indításra│
│                                     │
│  ┌───────────────────────────────┐ │
│  │   🐔 CIKLUS INDÍTÁS           │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Funkciók:**
- Gomb: "Ciklus Indítás" → Form megjelenítés
- Form: Betelepített darabszám, Dátum, Fajta
- Service call: `cfm_manager.start_cycle`

---

### 2️⃣ ACTIVE CYCLE (Futó Ciklus)

**Feltétel:**
- `sensor.manager_X_cycle_status` = "active"
- Van aktív ciklus

**UI:**
```
┌─────────────────────────────────────┐
│  Istálló 1 - MSZ/2025/001          │
├─────────────────────────────────────┤
│  Kor: 15 nap  │  Állomány: 4975 db │
│  Fajta: Ross 308 vegyesivar         │
├─────────────────────────────────────┤
│                                     │
│  Súly: 2450g     FCR: 1.85         │
│  Takarmány: 450kg/nap               │
│  Elhullás: 25 db (0.5%)            │
│                                     │
├─────────────────────────────────────┤
│  🚚 Elszállítás  💀 Elhullás        │
│  📊 Ciklus Lezárás                  │
│                                     │
│  ⏰ Következő mentés: holnap 07:00 │
└─────────────────────────────────────┘
```

**Funkciók:**
- **Automatikus napi mentés (07:00)**
  - Szenzorok beolvasása
  - Service call: `cfm_manager.record_daily_data`
  - Értesítés: "Napi adat mentve!"
- Gomb: "Elszállítás" → Modal (darabszám input)
- Gomb: "Elhullás" → Modal (darabszám input)
- Gomb: "Ciklus Lezárás" → Confirm dialog
- Real-time sensor frissítés (30s poll vagy event)

---

### 3️⃣ CLOSED CYCLE (Lezárt)

**Feltétel:**
- Ciklus lezárva (status = "completed")

**UI:**
```
┌─────────────────────────────────────┐
│  Istálló 1 - MSZ/2025/001          │
│  ✅ Lezárt ciklus                   │
├─────────────────────────────────────┤
│  Időtartam: 42 nap                  │
│  Végső állomány: 4500 db            │
│  Végső súly: 3200g                  │
│  Végső FCR: 1.92                    │
│  Elszállítás: 4500 db               │
│  Elhullás: 500 db (10%)            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   🐔 ÚJ CIKLUS INDÍTÁS        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Funkciók:**
- Összefoglaló adatok megjelenítése
- Gomb: "Új Ciklus Indítás" → Visszaállás PRE-START-ra

---

## 🛠️ IMPLEMENTÁCIÓ TERV

### Fázis 1: Card Alapok (v2.0.0) ✅ KÉSZ

**Feladatok:**
- [x] `src/card-main.js` - Fő card osztály
- [x] `src/card-config.js` - Config editor (Manager választás)
- [x] State machine implementálás (3 állapot)
- [x] Sensor értékek beolvasása (hass.states)
- [x] `dist/cfm-manager-card-v2.js` - Production build

**Megvalósítva:** 2025-10-20
**Fájlok:**
- `src/card-main.js` (CfmManagerCard osztály)
- `src/card-config.js` (CfmManagerCardEditor osztály)
- `src/styles/card-styles.js` (CSS styles)
- `dist/cfm-manager-card-v2.js` (Production - 1 fájl, inline styles)

---

### Fázis 2: PRE-START UI (v2.1.0)

**Feladatok:**
- [ ] `src/states/pre-start-view.js` - "Ciklus Indítás" gomb
- [ ] `src/components/cycle-start-form.js` - Form (betelepített db, dátum, fajta)
- [ ] Service call: `cfm_manager.start_cycle`
- [ ] Validációk (minimális értékek)

**Időigény:** 2 óra

---

### Fázis 3: ACTIVE CYCLE UI (v2.2.0)

**Feladatok:**
- [ ] `src/states/active-cycle-view.js` - Dashboard
- [ ] Sensor megjelenítés (súly, FCR, állomány)
- [ ] `src/components/shipping-modal.js` - Elszállítás popup
- [ ] `src/components/mortality-modal.js` - Elhullás popup
- [ ] Service call-ok (shipping, mortality, close_cycle)

**Időigény:** 3-4 óra

---

### Fázis 4: Automatikus Időzítő (v2.3.0)

**Feladatok:**
- [ ] `src/services/scheduler.js` - Napi időzítő (07:00)
- [ ] setupDailyScheduler() implementálás
- [ ] Sensor beolvasás (sensor.bird_scale_weight, sensor.silo_weight_*)
- [ ] Service call: `cfm_manager.record_daily_data`
- [ ] Push notification: "Napi adat mentve!"

**Példa kód:**
```javascript
class Scheduler {
  setupDailyScheduler(targetHour = 7) {
    const now = new Date();
    const target = new Date();
    target.setHours(targetHour, 0, 0, 0);

    if (now > target) {
      target.setDate(target.getDate() + 1);
    }

    const timeout = target - now;

    setTimeout(() => {
      this.recordDailyData();
      this.setupDailyScheduler(targetHour);
    }, timeout);
  }

  recordDailyData() {
    const cycleId = this.getCurrentCycleId();
    const weight = this.getSensorValue('sensor.bird_scale_weight');
    const feed = this.calculateFeedConsumed();

    this.hass.callService('cfm_manager', 'record_daily_data', {
      cycle_id: cycleId,
      date: new Date().toISOString().split('T')[0],
      average_weight: weight,
      feed_consumed: feed
    });

    this.showNotification('Napi adat mentve (07:00)!');
  }
}
```

**Időigény:** 2-3 óra

---

### Fázis 5: Config Editor (v2.4.0)

**Feladatok:**
- [ ] Cycle Manager választás (dropdown)
- [ ] Napi mentés időpont beállítás (07:00 default, testreszabható)
- [ ] Értesítések be/ki kapcsolás
- [ ] UI customization (színek, ikonok)

**UI:**
```yaml
# Card Config (Lovelace UI Editor)
type: custom:cfm-manager-card
manager_id: 1                      # Cycle Manager választás
daily_save_time: "07:00"           # Napi mentés időpont (testreszabható)
show_notifications: true           # Értesítések
show_debug: false                  # Debug mód
```

**Időigény:** 2 óra

---

### Fázis 6: Build & HACS Deploy (v2.5.0)

**Feladatok:**
- [ ] Build script (rollup.js vagy webpack)
- [ ] Source fájlok összecsomagolása → dist/cfm-manager-card.js
- [ ] Minification (production build)
- [ ] HACS release (GitHub tag)

**Időigény:** 1 óra

---

## 📦 ÖSSZESEN

**Időigény:** 12-15 óra (6 fázis)

**Eredmény:**
- ✅ Production-ready Lovelace card
- ✅ YAML-mentes működés
- ✅ Automatikus időzítők (07:00)
- ✅ Dinamikus UI (3 állapot)
- ✅ Natív HA entitások használata

---

## 🚀 KÖVETKEZŐ LÉPÉS

**Kezdjük a Fázis 1-gyel:**
1. `src/` mappa létrehozása
2. `card-main.js` - Fő card osztály
3. State machine (3 állapot detektálás)
4. Sensor beolvasás (hass.states)

**Indító üzenet következő sessionhez:**
```
Folytassuk a CFM Manager HACS Lovelace Card fejlesztését!

Nyisd meg:
- HACS/CARD_ARCHITECTURE.md (ez a fájl)
- docs/frontend/LOVELACE_ARCHITECTURE.md

Kezdjük a Fázis 1-gyel (Card Alapok v2.0.0):
- src/ mappa létrehozása
- card-main.js implementálás
- State machine (PRE-START, ACTIVE, CLOSED)
```

---

**Verzió:** v2.0.0 (Fázis 1 KÉSZ ✅)
**Utolsó frissítés:** 2025-10-20
**Állapot:**
- ✅ Fázis 1 befejezve (Card alapok, state machine, config editor)
- 📋 Fázis 2 következik (PRE-START UI, ciklus indítás form)

**Következő lépések:**
1. **Tesztelés:** Másold a `dist/cfm-manager-card-v2.js` fájlt HA-ba (`www/community/cfm-manager-card/`)
2. **Lovelace:** Adj hozzá egy kártyát `type: custom:cfm-manager-card`, `manager_id: 1`
3. **Ellenőrizd:** Működik-e a state machine (PRE-START/ACTIVE/CLOSED)
4. **Fázis 2:** Ciklus indítás form implementálása
