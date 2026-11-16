# Tower Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เกม Tower Defense บนเว็บที่ผู้ชม TikTok Live เล่นผ่านคอมเมนต์ ไลก์ และของขวัญ

**Architecture:** ตรรกะเกมเป็นโมดูล JavaScript ล้วน (ไม่พึ่ง Phaser) ทดสอบด้วย Vitest ได้ Phaser ทำหน้าที่วาดภาพเท่านั้น เซิร์ฟเวอร์ Node.js แปลง event ของ TikTok (หรือ mock) เป็น event มาตรฐานแล้วส่งผ่าน WebSocket ไปที่เกม

**Tech Stack:** Node.js 20+, ES modules, Vite, Phaser 3, `ws`, `tiktok-live-connector`, Vitest

**Spec:** `docs/superpowers/specs/2026-11-16-tower-live-design.md`

## Global Constraints

- ไลฟ์จาก TikTok บนคอม จับภาพด้วย OBS หรือ TikTok LIVE Studio
- ตัวเชื่อมคือ `tiktok-live-connector` (ไม่เป็นทางการ) ต้องมีโหมด mock ที่ทำงานได้โดยไม่ต้องไลฟ์
- ชนะเมื่อรอดครบ 10 เวฟ แพ้เมื่อ HP บ้านเป็น 0 ความยาวรอบเป้าหมาย 5-8 นาที
- คอมเมนต์ `1` / `2` / `3` = เรียกทหาร 3 แบบ ไลก์ = เติมพลังงานรวม
- ของขวัญเล็ก = อัปเกรดหอคอย / กลาง = สกิลล้างจอ / ใหญ่ = เรียกบอสช่วย
- ค่าสมดุลทั้งหมดอยู่ใน `game/config.js` ไฟล์เดียว
- ไม่มีบัญชีผู้เล่น ฐานข้อมูล หรือการเก็บคะแนนถาวร
- ต้องมีพลังงานเกิดเองช้า ๆ และจำกัดคำสั่งต่อคนต่อวินาที (กันสแปม)
- กฎ LIVE (ดู `docs/compliance.md`): ข้อความบนจอห้ามชวน/กดดันให้ส่งของขวัญ; ผลของขวัญต้องแน่นอน ไม่มีการสุ่ม ไม่มีรางวัลมีมูลค่า; เกมต้องชนะได้โดยไม่มีของขวัญ; ตัวเชื่อมอ่านอย่างเดียว ไม่ล็อกอิน ไม่ส่งข้อความอัตโนมัติ; ห้ามใช้ mock ระหว่างไลฟ์จริง; กรองชื่อ/คอมเมนต์ก่อนขึ้นจอ

## Review Focus

- คอมเมนต์ว่าง ยาวมาก มีช่องว่างรอบ ๆ เช่น ` 1 ` หรือเป็นอีโมจิ: ผู้ใช้คาดว่า `" 1 "` นับเป็น `1` ส่วนข้อความอื่นถูกเมินโดยไม่ error (Task 2)
- ผู้ชมคนเดียวสแปมคำสั่ง: ผู้ใช้คาดว่าเกมนับแค่ 3 คำสั่ง/วินาที/คน (Task 2)
- พลังงานไม่พอเรียกทหาร: ผู้ใช้คาดว่าไม่หักพลังงานและไม่สร้างทหาร (Task 3)
- ของขวัญเข้ามาหลังเกมจบ: ผู้ใช้คาดว่าไม่มีผลและไม่ crash (Task 3)
- WebSocket หลุด/เกมเปิดก่อนเซิร์ฟเวอร์: ผู้ใช้คาดว่าเกมเชื่อมต่อใหม่เองและยังเล่นด้วยคีย์บอร์ดได้ (Task 5)

---

### Task 1: โครงโปรเจกต์และ config

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `game/config.js`
- Test: `tests/config.test.js`

**Interfaces:**
- Produces: `export const config` จาก `game/config.js` รูปร่างดังนี้ (ทุก task ถัดไปใช้ชื่อเหล่านี้):
  - `config.house.maxHp = 100`
  - `config.energy = { start: 10, max: 50, passivePerSec: 0.5, perLike: 1, maxLikesPerEvent: 20 }`
  - `config.rateLimit = { commandsPerSec: 3 }`
  - `config.units = { soldier: {cost: 5, hp: 30, dmg: 6, speed: 40}, archer: {cost: 8, hp: 18, dmg: 10, speed: 30}, knight: {cost: 12, hp: 80, dmg: 8, speed: 35} }`
  - `config.commands = { "1": "soldier", "2": "archer", "3": "knight" }`
  - `config.gifts = { smallMaxDiamonds: 9, mediumMaxDiamonds: 99 }` (≤9 = small, 10-99 = medium, ≥100 = large)
  - `config.waves = { total: 10, baseCount: 5, countPerWave: 3, baseHp: 20, hpPerWave: 5, enemyDmg: 5, enemySpeed: 25, spawnIntervalSec: 1.2, restSec: 4 }`
  - `config.tower = { baseDmg: 4, dmgPerLevel: 2, maxLevel: 5, range: 220, fireIntervalSec: 1 }`
  - `config.boss = { hp: 300, dmg: 20, durationSec: 20 }`
  - `config.clearAllDamage = 9999`

- [ ] **Step 1: Write the failing test** `tests/config.test.js::"config has required keys"` ตรวจว่า `config.waves.total === 10`, `config.commands["1"] === "soldier"`, และทุกยูนิตใน `config.units` มี `cost, hp, dmg, speed` เป็นตัวเลขบวก
- [ ] **Step 2: Run** `npx vitest run tests/config.test.js` Expected: FAIL (ไม่พบ `game/config.js`)
- [ ] **Step 3:** `git init`, `npm init -y`, ตั้ง `"type": "module"`, ติดตั้ง `npm i phaser ws tiktok-live-connector` และ `npm i -D vite vitest`; เพิ่ม scripts `dev` (vite), `server` (node server/index.js), `mock` (node server/index.js --mock), `test` (vitest run); เขียน `game/config.js` ตามค่าข้างบน
- [ ] **Step 4: Run** `npm test` Expected: PASS
- [ ] **Step 5: Commit** `git add -A && git commit -m "chore: scaffold project and config"`

### Task 2: แปลง event เป็น action และจำกัดอัตรา

**Files:**
- Create: `game/core/events.js`
- Test: `tests/events.test.js`

**Interfaces:**
- Consumes: `config` จาก Task 1
- Produces:
  - Event มาตรฐาน: `{ type: "comment"|"like"|"gift"|"join", userId: string, nickname: string, text?: string, count?: number, diamonds?: number }`
  - `mapEvent(event, config) -> Action | null` โดย Action เป็นหนึ่งใน `{type:"summon", unit, userId, nickname}`, `{type:"energy", amount}`, `{type:"upgrade", userId, nickname}`, `{type:"clear", userId, nickname}`, `{type:"boss", userId, nickname}`
  - `createRateLimiter(commandsPerSec: number) -> (userId: string, nowMs: number) => boolean`

- [ ] **Step 1: Write the failing tests** ใน `tests/events.test.js`:
  - `"comment '1' maps to summon soldier"`
  - `"comment ' 2 ' (spaces) maps to summon archer"`
  - `"unknown, empty, emoji comments return null"` (`""`, `"hello"`, `"😀"`, `"1".repeat(500)`)
  - `"like count 5 gives energy 5"` และ `"like count 100 is capped at maxLikesPerEvent"`
  - `"gift 5 diamonds -> upgrade, 50 -> clear, 100 -> boss"` และ `"gift 0 diamonds returns null"`
  - `"rate limiter allows 3 per second per user, resets after 1s, users independent"`
- [ ] **Step 2: Run** `npx vitest run tests/events.test.js` Expected: FAIL
- [ ] **Step 3: Implement** `mapEvent` (trim ข้อความก่อนเทียบ `config.commands`; `count` ของไลก์จำกัดที่ `maxLikesPerEvent`) และ `createRateLimiter` (หน้าต่างเลื่อน 1000 ms ต่อ userId)
- [ ] **Step 4: Run** `npx vitest run tests/events.test.js` Expected: PASS
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: event mapping and rate limiter"`

### Task 3: แกนเกม (สถานะ เวฟ การต่อสู้ ของขวัญ)

**Files:**
- Create: `game/core/state.js`
- Test: `tests/state.test.js`

**Interfaces:**
- Consumes: `config`, ชนิด Action จาก Task 2
- Produces:
  - `createGame(config) -> GameState` โดย `GameState = { phase: "playing"|"won"|"lost", houseHp, energy, wave (1-based), towerLevel, units[], enemies[], boss|null, leaderboard: Record<userId, {nickname, score}>, log[] }`
  - `applyAction(state, action, config) -> boolean` (true ถ้ามีผล) หลังเกมจบต้องคืน false และไม่แก้สถานะ; `summon` หักพลังงานเมื่อพอเท่านั้น; `upgrade` เพิ่ม `towerLevel` ไม่เกิน `tower.maxLevel`; `clear` ฆ่าศัตรูทั้งหมด; `boss` ตั้ง `state.boss` อยู่ `boss.durationSec` วินาที; ทุก action ที่มีผลเพิ่มคะแนนใน `leaderboard` (summon +1, like energy ไม่นับ, upgrade +5, clear +10, boss +30)
  - `tick(state, dtSec, config) -> void` เพิ่มพลังงานเกิดเอง (ไม่เกิน `energy.max`), ปล่อยศัตรูตามเวฟ, เคลื่อนที่/ต่อสู้, หอคอยยิง, ศัตรูถึงบ้านลด `houseHp` ด้วย `enemyDmg`, เวฟหมดแล้วพัก `restSec` ก่อนเวฟถัดไป, ผ่านเวฟที่ `waves.total` = `won`, `houseHp <= 0` = `lost`
  - `topHelpers(state, n) -> {nickname, score}[]` เรียงคะแนนมากไปน้อย

- [ ] **Step 1: Write the failing tests** ใน `tests/state.test.js`:
  - `"summon deducts energy and adds a unit"`, `"summon with insufficient energy does nothing and returns false"`
  - `"passive energy grows but never exceeds max"`
  - `"upgrade caps at maxLevel"`, `"clear removes all enemies"`, `"boss expires after durationSec"`
  - `"wave n spawns baseCount + countPerWave*(n-1) enemies"`
  - `"enemy reaching house reduces houseHp; hp 0 -> phase lost"`
  - `"surviving wave 10 -> phase won"`
  - `"applyAction after game over returns false and leaves state unchanged"`
  - `"topHelpers sorts by score desc"`
- [ ] **Step 2: Run** `npx vitest run tests/state.test.js` Expected: FAIL
- [ ] **Step 3: Implement** ใน `game/core/state.js` เป็นฟังก์ชันล้วน ไม่มีการอ้าง DOM/Phaser; ใช้พิกัด x แกนเดียว (บ้านที่ x=0 ศัตรูเริ่มที่ x=800 เดินเข้าหา); ใช้ `Math.random` ไม่ได้ในทางที่ทำให้เทสต์ไม่คงที่ (ไม่ต้องใช้สุ่มเลยใน MVP)
- [ ] **Step 4: Run** `npm test` Expected: PASS ทั้งหมด
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: core game state, waves, gifts"`

### Task 4: เซิร์ฟเวอร์ WebSocket และ mock

**Files:**
- Create: `server/hub.js`, `server/mock.js`, `server/index.js`
- Test: `tests/hub.test.js`

**Interfaces:**
- Consumes: ชนิด Event มาตรฐานจาก Task 2
- Produces:
  - `createHub(port: number) -> { broadcast(event): void, close(): Promise<void>, port: number }` ส่ง event เป็น JSON ไปทุกไคลเอนต์ที่ต่อ
  - `startMock(emit: (event) => void) -> () => void` (คืนฟังก์ชันหยุด) ปล่อย event สุ่มทุก 300-900 ms: คอมเมนต์ `1/2/3`, ไลก์ 1-10, ของขวัญหายาก (เช่น 1/20 ของ event)
  - `server/index.js`: `--mock` ใช้ mock; ไม่ใส่ใช้ตัวเชื่อม TikTok (Task 6); พอร์ต 8080

- [ ] **Step 1: Write the failing test** `tests/hub.test.js::"hub broadcasts events to connected clients"` (เปิด hub พอร์ต 0 หรือพอร์ตสุ่ม ต่อ `ws` client แล้วตรวจว่าได้ JSON ที่ส่ง) และ `"mock emits valid events within 2s"` (ทุก event ผ่านการตรวจ `type` และ `userId`)
- [ ] **Step 2: Run** `npx vitest run tests/hub.test.js` Expected: FAIL
- [ ] **Step 3: Implement** ด้วยแพ็กเกจ `ws`
- [ ] **Step 4: Run** `npx vitest run tests/hub.test.js` Expected: PASS
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: websocket hub and mock event source"`

### Task 5: ฉากเกม Phaser และ overlay

**Files:**
- Create: `index.html`, `game/main.js`, `game/net.js`, `game/scenes/PlayScene.js`, `game/scenes/GameOverScene.js`, `overlay/hud.js`
- Modify: `vite.config.js` (ถ้าจำเป็น)

**Interfaces:**
- Consumes: `createGame`, `applyAction`, `tick`, `topHelpers` (Task 3); `mapEvent`, `createRateLimiter` (Task 2); hub ที่พอร์ต 8080 (Task 4)
- Produces:
  - `connect(url: string, onEvent: (event) => void) -> { close(): void }` ใน `game/net.js` เชื่อมต่อใหม่เองทุก 2 วินาทีเมื่อหลุด
  - `PlayScene` วาดบ้าน ทหาร ศัตรู บอส พลังงาน HP เวฟ อันดับผู้ช่วยเด่น 5 คน และคำอธิบายบนจอ "พิมพ์ 1/2/3 เรียกทหาร • ไลก์ช่วยเติมพลังงาน" (ห้ามมีข้อความที่ชวนหรือกดดันให้ส่งของขวัญ; ของขวัญแสดงผลเมื่อมีคนส่งมาเท่านั้น); แสดงป้าย "DEMO" ตลอดเมื่อ event มาจาก mock หรือคีย์บอร์ด
  - คีย์บอร์ดจำลอง: `1/2/3` = comment, `L` = like x5, `G` = gift 5 เพชร, `H` = gift 50, `B` = gift 100
  - `GameOverScene` แสดงผลชนะ/แพ้ + ผู้ช่วยเด่น แล้วเริ่มรอบใหม่เองใน 10 วินาที

- [ ] **Step 1: Implement** ใช้รูปสี่เหลี่ยม/วงกลมแทนสไปรต์ก่อน (ยังไม่ใช้ภาพสำเร็จรูป); event จากเครือข่ายและคีย์บอร์ดผ่าน `createRateLimiter` + `mapEvent` + `applyAction` เส้นทางเดียวกัน
- [ ] **Step 2: Run** `npm run dev` และ `npm run mock` พร้อมกัน เปิดเบราว์เซอร์ Expected: เห็นเกมเดิน เกิดศัตรู และ mock สั่งทหารได้เองโดยไม่ต้องกดคีย์
- [ ] **Step 3: ตรวจด้วยมือ** (บันทึกผลใน commit message): กด `1` แล้วทหารปรากฏ, ปิด `npm run mock` แล้วเปิดใหม่ เกมต้องเชื่อมต่อกลับเอง, เล่นจนจบเวฟ 10 เห็นหน้าชนะ
- [ ] **Step 4: Commit** `git add -A && git commit -m "feat: Phaser scenes, HUD and keyboard simulator"`

### Task 6: ตัวเชื่อม TikTok จริง

**Files:**
- Create: `server/tiktok.js`
- Modify: `server/index.js`
- Test: `tests/tiktok.test.js`

**Interfaces:**
- Consumes: `createHub` (Task 4)
- Produces: `normalize(raw: unknown, kind: "chat"|"like"|"gift"|"member") -> Event | null` (ฟังก์ชันล้วน ทดสอบได้) และ `startTikTok(username: string, emit: (event) => void) -> () => void`; ใช้ชื่อผู้ใช้จาก `TIKTOK_USERNAME` (ถ้าไม่ตั้งให้ออกพร้อมข้อความชัดเจน); หลุดแล้วลองใหม่ทุก 10 วินาที; บันทึก event ลง `logs/events.jsonl` ไว้เล่นซ้ำ

- [ ] **Step 1: Write the failing test** `tests/tiktok.test.js` ด้วยข้อมูลตัวอย่างแบบที่ไลบรารีส่ง: `"normalize maps chat to comment"`, `"normalize maps gift using diamondCount*repeatCount"`, `"normalize returns null for malformed input"` (`null`, `{}`, ไม่มี userId)
- [ ] **Step 2: Run** `npx vitest run tests/tiktok.test.js` Expected: FAIL
- [ ] **Step 3: Implement** `normalize` และ `startTikTok` อ้างอิง README ของ `tiktok-live-connector` ที่ติดตั้งจริงสำหรับชื่อ event และฟิลด์ (ห้ามเดา ให้เปิดอ่านใน `node_modules`)
- [ ] **Step 4: Run** `npm test` Expected: PASS ทั้งหมด
- [ ] **Step 5: ตรวจกับไลฟ์จริง** `TIKTOK_USERNAME=<ชื่อ> npm run server` ขณะไลฟ์อยู่ Expected: คอมเมนต์ที่พิมพ์ในไลฟ์ขึ้นใน `logs/events.jsonl` และกด `1` แล้วเห็นทหารเกิด ถ้าไม่เป็นไปตามนี้ ให้รายงานผู้ใช้ ห้ามทำเหมือนผ่าน
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: TikTok live connector"`

### Task 6.5: ตัวป้องกันกฎ LIVE (ทำก่อน Task 7)

**Files:**
- Create: `game/core/safety.js`, `server/guard.js`
- Modify: `server/index.js`, `server/tiktok.js` (บันทึกแบบย่อรหัส), `overlay/hud.js` (ใช้ตัวกรอง)
- Test: `tests/safety.test.js`, `tests/guard.test.js`, `tests/fairness.test.js`

**Interfaces:**
- Produces:
  - `sanitizeName(name: string) -> string` ตัดความยาวไม่เกิน 16 ตัวอักษร ลบอักขระควบคุม แทนคำในรายการ `game/core/blocklist.js` ด้วย `***` (รายการเริ่มต้นเป็นคำหยาบไทย/อังกฤษที่พบบ่อย ผู้ใช้เพิ่มเองได้)
  - `hashUserId(userId: string) -> string` (sha256 ย่อ 10 ตัวอักษร)
  - `assertModeAllowed(env: Record<string,string|undefined>, argv: string[]) -> void` โยน Error ถ้ามีทั้ง `--mock` และ `TIKTOK_USERNAME`

- [ ] **Step 1: Write the failing tests:**
  - `tests/safety.test.js`: `"sanitizeName truncates to 16 chars"`, `"sanitizeName masks blocklisted words"`, `"sanitizeName strips control chars"`, `"hashUserId is stable and does not contain the input"`
  - `tests/guard.test.js`: `"mock together with TIKTOK_USERNAME throws"`, `"mock alone ok"`, `"tiktok alone ok"`
  - `tests/fairness.test.js`: `"game is winnable with comments and likes only (no gifts)"` จำลองด้วย `createGame/applyAction/tick` โดยส่งเฉพาะ event `comment`/`like` ตามกลยุทธ์ง่าย ๆ (ใช้พลังงานทุกครั้งที่พอ) ตลอด 10 เวฟ ต้องจบ `won`; และ `"gift path uses no randomness"` (สแปย `Math.random` แล้วเรียก upgrade/clear/boss ต้องไม่ถูกเรียก)
- [ ] **Step 2: Run** `npx vitest run tests/safety.test.js tests/guard.test.js tests/fairness.test.js` Expected: FAIL
- [ ] **Step 3: Implement** ตามอินเทอร์เฟซ; เรียก `assertModeAllowed` ตอนเริ่ม `server/index.js`; `server/tiktok.js` บันทึก `hashUserId(userId)` แทน userId จริง และไม่เขียน nickname ลงไฟล์; ลบไฟล์ใน `logs/` ที่เก่ากว่า 7 วันตอนเริ่มเซิร์ฟเวอร์; เพิ่ม `logs/` ใน `.gitignore`; `overlay/hud.js` ผ่าน `sanitizeName` ทุกชื่อที่แสดง; ตัวเชื่อมต้องไม่ล็อกอิน ไม่ส่งข้อความ และไม่ใช้คุกกี้ของบัญชี (ตรวจด้วย `grep` ว่าไม่มีการเรียกส่งแชทใน `server/`)
- [ ] **Step 4: Run** `npm test` Expected: PASS ทั้งหมด; ถ้า `"winnable without gifts"` ไม่ผ่าน ให้ปรับค่าใน `game/config.js` (ไม่ใช่ลบเทสต์)
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: LIVE rule safeguards"`

### Task 7: คู่มือไลฟ์และปรับสมดุล

**Files:**
- Create: `README.md`

- [ ] **Step 0: เช็กลิสต์ก่อนไลฟ์ (ผู้ใช้ทำเอง)** อ่านกฎทางการในแอป (LIVE Center > Rules and Guidance, Virtual Items/Coins Policy) แล้วไล่ `docs/compliance.md` ทุกข้อ; ยืนยันสิทธิ์ไลฟ์และรับของขวัญของบัญชี
- [ ] **Step 1:** เขียน README สั้น (ต้องมีส่วน "ก่อนไลฟ์" ลิงก์ `docs/compliance.md`): ติดตั้ง, วิธีรัน mock, วิธีรันกับ TikTok, ตั้งค่า OBS (Browser Source หรือ Window Capture ที่ `http://localhost:5173`), ตารางคำสั่ง/ของขวัญ, ข้อควรระวังเรื่องตัวเชื่อมไม่เป็นทางการ
- [ ] **Step 2: ไลฟ์ทดสอบสั้น** ปรับตัวเลขใน `game/config.js` ตามผลจริง (ความยาวรอบ 5-8 นาที) บันทึกค่าที่เปลี่ยนใน commit message
- [ ] **Step 3: Commit** `git add -A && git commit -m "docs: README and balance pass"`
