# Kế hoạch 1 — Xe bánh mì chơi chung (nền móng) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2–3 người trong nhà mở trình duyệt, nhập cùng một mã quán, cùng vận hành một xe bánh mì 3D (máy tự làm món, bê ra kệ, khách mua, đứng thu ngân, mở rộng bằng ô trả tiền), game tự lưu và chạy online trên Render.

**Architecture:** Mô phỏng game là TypeScript thuần trong `shared/` (không DOM, không Node API, tất định theo seed) → server Colyseus chạy mô phỏng 20 tick/giây và gửi snapshot JSON 10 lần/giây; client Vite + Three.js chỉ gửi hướng di chuyển, vẽ lại snapshot có nội suy, và dự đoán chuyển động nhân vật của mình bằng cùng hàm `movePlayer` trong `shared/`. Lưu thế giới dạng JSONB trong Neon Postgres.

**Tech Stack:** Node 22.x, TypeScript (strict), npm workspaces, Vitest, Colyseus (bản ổn định mới nhất ≥0.16, theo docs chính thức để khởi tạo server) + `colyseus.js`, Express, `pg`, `tsx` (chạy server TS trực tiếp), Vite, Three.js (≥0.170).

**Spec:** `docs/superpowers/specs/2026-11-17-quan-an-viet-design.md`

### Lộ trình các kế hoạch (mỗi kế hoạch viết khi kế hoạch trước xong)
1. **Kế hoạch này** — nền móng + xe bánh mì chơi chung + lưu + deploy.
2. Quản lý quán: đổi giá (§8), nhân viên phụ bếp/thu ngân + tuyển/sa thải + lương (§9), nâng cấp nhân vật/nhân viên/máy (§10), marketing (§8).
3. Ngân hàng & nợ đến hạn, bán tài sản, phá sản, bảng tổng kết đầy đủ chi phí (§11, §6).
4. Bán online: đăng ký, shipper xe máy/ô tô, nhân viên giao đơn (§8.1).
5. Nhiều địa điểm: bản đồ/xe máy di chuyển, thuê mặt bằng + chọn loại hình, quán cơm tấm, quán phở & cà phê, bàn ghế + dọn bàn (§7.3, §7.4, §5); công tắc bật/tắt từng máy (§7.2).
6. Trang trại + kho tổng + giao hàng mỗi sáng (§13).
7. Trang phục (§10).

## Global Constraints

- Tiền lưu là **số nguyên đồng**; hiển thị chỉ qua `formatK` ("K = 1.000đ", ví dụ `5K`, `2.987,5K`).
- Mọi chữ người chơi thấy bằng **tiếng Việt**; không dùng tên thương hiệu có thật.
- **Không bóng đổ** (`renderer.shadowMap.enabled = false`), `pixelRatio ≤ 1.5`, mục tiêu 60 FPS trên MacBook Air M1; bóng tròn giả dưới chân nhân vật.
- Server quyết định mọi thứ; `shared/src/sim/**` không import gì từ DOM, Node, Colyseus hay Three.
- Mọi số liệu nội dung/cân bằng nằm trong `shared/src/content/**`, không rải trong logic.
- **Thời gian chỉ chạy khi có ít nhất 1 người online.**
- Tối đa **4** người/thế giới (gia đình 2–3 người + dư 1).
- Node `22.x` (`engines` + `.nvmrc`). Render: Web Service Free, vùng **Singapore**; Neon vùng **AWS Singapore**; biến môi trường `DATABASE_URL`, `NODE_ENV=production`.
- Khi `NODE_ENV=production`, `npm ci` bỏ devDependencies → **lệnh build trên Render là `npm ci --include=dev && npm run build`**.

## Review Focus

1. **Mất mạng/đóng tab khi đang đứng trên ô trả tiền** → ô phải nhả người đó, phần đã trả giữ nguyên, người khác bước vào đếm lại 2 giây từ đầu. (Test ở Task 7.)
2. **Tiền không bao giờ âm** dù máy, ô trả tiền cùng trừ trong một tick. (Test ở Task 5, Task 7, bất biến trong bot cả ngày ở Task 9.)
3. **Cùng một trình duyệt mở 2 tab** (cùng token) → chỉ một nhân vật; tab cũ bị đá ra với mã 4001. (Test ở Task 11.)
4. **Render khởi động lại server giữa ngày** → tải lại từ lần lưu gần nhất; trạng thái tạm (khách, người trên ô, input) được dọn sạch; mọi người offline cho tới khi vào lại. (Test ở Task 9 `normalizeLoaded`, Task 11 lưu khi phòng đóng.)
5. **Gõ mã phòng lỏng lẻo** (`" abc def "`, `abcdef`, `ABC-DEF`) → vẫn vào đúng quán. (Test ở Task 10, dùng ở Task 12.)

---

## Cấu trúc file

```
package.json              workspaces + scripts (dev, build, start, test, typecheck)
tsconfig.base.json        strict, ES2022, moduleResolution bundler
vitest.config.ts          projects: shared, server, client
render.yaml  .nvmrc  .env.example  .gitignore  README.md
shared/
  package.json            name @qnm/shared, exports "./src/index.ts"
  src/index.ts            re-export public API
  src/money.ts            K(), formatK()
  src/content/            ids.ts ingredients.ts items.ts stations.ts balance.ts shops/banhMi.ts index.ts
  src/sim/                rng.ts world.ts time.ts movement.ts production.ts carry.ts
                          payTiles.ts customers.ts rating.ts players.ts tick.ts snapshot.ts events.ts
  src/net/protocol.ts     tên message, JoinOptions, Snapshot types
  test/*.test.ts
server/
  package.json            name @qnm/server
  src/index.ts            bootstrap (PORT, store, listen)
  src/app.ts              createGameServer(store) → { httpServer, gameServer }
  src/rooms/WorldRoom.ts
  src/persistence/        worldStore.ts memoryWorldStore.ts pgWorldStore.ts
  src/codes.ts
  test/*.test.ts
client/
  package.json  index.html  vite.config.ts
  src/main.ts  src/lobby.ts  src/net.ts  src/input.ts  src/style.css
  src/game/               gameLoop.ts interp.ts prediction.ts
  src/render/             scene.ts camera.ts stations.ts characters.ts items.ts payTiles.ts
  src/ui/                 hud.ts eventLog.ts daySummary.ts floatText.ts
  test/*.test.ts
```

---

### Task 1: Khởi tạo repo + tiền tệ

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `.gitignore`, `.nvmrc`, `.env.example`, `shared/package.json`, `shared/tsconfig.json`, `shared/src/index.ts`, `shared/src/money.ts`
- Test: `shared/test/money.test.ts`

**Interfaces:**
- Produces: `K(k: number): number` (đồng, số nguyên), `formatK(dong: number): string`.

- [ ] **Step 1:** `git init` ở `/home/luuns@smartosc.com/project/syluu/game`; `.gitignore` gồm `node_modules`, `dist`, `.env`, `.superpowers/`. `.env.example` có `DATABASE_URL=` và `PORT=2567`. Root `package.json`: `"private": true`, `"workspaces": ["shared","server","client"]`, `"engines": {"node": "22.x"}`, scripts `test: vitest run`, `typecheck: tsc -b` (hoặc `tsc --noEmit -p` từng gói). Cài `typescript vitest` ở root.
- [ ] **Step 2: Viết test thất bại** `shared/test/money.test.ts`:
```ts
expect(K(5)).toBe(5000); expect(K(2.5)).toBe(2500);
expect(formatK(5000)).toBe('5K');
expect(formatK(2_987_500)).toBe('2.987,5K');
expect(formatK(-300_000)).toBe('-300K');
expect(formatK(1200)).toBe('1,2K');
expect(formatK(0)).toBe('0K');
expect(formatK(25_000_000)).toBe('25.000K');
```
- [ ] **Step 3:** `npx vitest run shared/test/money.test.ts` → FAIL (không có module).
- [ ] **Step 4:** Viết `shared/src/money.ts`: `K` làm tròn về số nguyên; `formatK` chia 1000, tối đa 1 chữ số thập phân, dấu `.` hàng nghìn, `,` thập phân (định dạng tay, không phụ thuộc `Intl` locale của máy chủ). Re-export trong `shared/src/index.ts`.
- [ ] **Step 5:** Chạy lại → PASS.
- [ ] **Step 6:** Commit cả spec và plan: `git add -A && git commit -m "chore: khởi tạo repo, tiền tệ K"`.

---

### Task 2: Dữ liệu nội dung xe bánh mì

**Files:**
- Create: `shared/src/content/{ids.ts,ingredients.ts,items.ts,stations.ts,balance.ts,shops/banhMi.ts,index.ts}`
- Test: `shared/test/content.test.ts`

**Interfaces:**
- Produces (types trong `ids.ts` / `stations.ts`):
```ts
type IngredientId = 'bot_mi'|'trung'|'thit_lon'|'rau'|'tra';
type ItemId = 'banh_mi'|'trung_op'|'thit_nuong'|'banh_mi_trung'|'banh_mi_thit'|'tra_da';
type ShopId = 'banh_mi';
interface IngredientDef { id: IngredientId; name: string; marketPrice: number }
interface ItemDef { id: ItemId; name: string; sellable: boolean; basePrice: number; demandWeight: number; color: number }
type StationDef =
  | { kind:'producer'; id:string; name:string; ingredients:{id:IngredientId;qty:number}[]; output:ItemId; cycleSec:number; outputCap:number; footprint:{w:number;d:number} }
  | { kind:'assembler'; id:string; name:string; inputs:{item:ItemId;qty:number}[]; inputCap:number; ingredients:{id:IngredientId;qty:number}[]; output:ItemId; cycleSec:number; outputCap:number; footprint:{w:number;d:number} }
  | { kind:'display'; id:string; name:string; item:ItemId; cap:number; footprint:{w:number;d:number} }
  | { kind:'cashier'; id:string; name:string; footprint:{w:number;d:number} };
interface PlacedStation { instanceId:string; def:string; x:number; z:number; unlockCost:number; requires:string[]; customerPoint?:{x:number;z:number} }
interface ShopLayout { id:ShopId; name:string; bounds:{minX:number;maxX:number;minZ:number;maxZ:number};
  entrance:{x:number;z:number}; exit:{x:number;z:number}; queueDir:{x:number;z:number};
  stations:PlacedStation[]; baseCustomerIntervalSec:number; hourCurve:[number,number,number][] }
```
- Produces: `INGREDIENTS`, `ITEMS`, `STATIONS` (Record theo id), `SHOPS: Record<ShopId, ShopLayout>`, `BALANCE` (hằng số), helpers `getStationDef(id)`, `getPlaced(shopId, instanceId)`.

**Số liệu (từ spec §7.3, §6; giá tính bằng `K()`):**

| Nguyên liệu | Giá chợ |
|---|---|
| bot_mi | 2K · trung 3K · thit_lon 6K · rau 1K · tra 0,5K |

| Item | Bán? | Giá gốc | demandWeight |
|---|---|---|---|
| banh_mi | có | 5K | 1 |
| trung_op | không | — | 0 |
| thit_nuong | có | 12K | 0.5 |
| banh_mi_trung | có | 15K | 1.5 |
| banh_mi_thit | có | 25K | 2 |
| tra_da | có | 3K | 1 |

| instanceId | def (kind) | Công thức | cycle / cap | unlockCost | requires |
|---|---|---|---|---|---|
| lo_banh_mi | producer | bot_mi → banh_mi | 3s / 8 | 0 | — |
| ke_banh_mi | display banh_mi | cap 10 | | 0 | — |
| thu_ngan | cashier | | | 0 | — |
| binh_tra | producer | tra → tra_da | 2s / 10 | 300K | ke_banh_mi |
| ke_tra_da | display tra_da | cap 10 | | 200K | binh_tra |
| chao_op_la | producer | trung → trung_op | 4s / 6 | 800K | ke_banh_mi |
| ban_bm_trung | assembler | banh_mi + trung_op + rau → banh_mi_trung, inputCap 6 | 2s / 6 | 1.500K | chao_op_la |
| ke_bm_trung | display banh_mi_trung | cap 8 | | 300K | ban_bm_trung |
| lo_than | producer | thit_lon → thit_nuong | 5s / 6 | 1.200K | ke_bm_trung |
| ke_thit_nuong | display thit_nuong | cap 8 | | 300K | lo_than |
| ban_bm_thit | assembler | banh_mi + thit_nuong + rau → banh_mi_thit, inputCap 6 | 2s / 6 | 2.000K | ke_thit_nuong |
| ke_bm_thit | display banh_mi_thit | cap 8 | | 300K | ban_bm_thit |

`BALANCE`: `START_MONEY = K(5000)`, `DAY_REAL_SEC = 360`, `OPEN_HOUR = 6`, `CLOSE_HOUR = 22`, `LAST_SPAWN_HOUR = 21.5`, `PLAYER_SPEED = 3.2`, `PLAYER_RADIUS = 0.3`, `PLAYER_CARRY = 4`, `INTERACT_DIST = 0.6`, `TRANSFER_INTERVAL = 0.2`, `CUSTOMER_SPEED = 2.0`, `MAX_CUSTOMERS = 20`, `WTP_MIN = 0.8`, `WTP_MAX = 1.3`, `ITEMS_PER_CUSTOMER_WEIGHTS = [0.6, 0.3, 0.1]`, `PATIENCE_SEC = 40`, `CASHIER_SERVICE_SEC = 1.0`, `QUEUE_SPACING = 0.8`, `RATING_WINDOW = 50`, `DEFAULT_STARS = 3`, `STAR_MULT = [[1,0.5],[2,0.75],[3,1.0],[4,1.35],[5,1.8]]`, `SCORE_FAST_SEC = 10`, `SCORE_OK_SEC = 20`, `SCORE_PRICEY = 3`, `SCORE_ABANDON = 1`, `PAY_TILE_DELAY_SEC = 2`, `PAY_TILE_DRAIN_SEC = 1.5`, `PAY_TILE_RADIUS = 0.7`, `TICK_HZ = 20`, `SNAPSHOT_HZ = 10`, `MAX_TICK_DT = 1.0`, `SUBSTEP_DT = 0.05`, `AUTOSAVE_SEC = 30`, `RECONNECT_SEC = 20`, `MAX_PLAYERS = 4`.
Shop bánh mì: `baseCustomerIntervalSec = 4`; `hourCurve = [[6,9,1.8],[9,11,0.8],[11,13,1.2],[13,17,0.6],[17,20,1.0],[20,22,0.5]]`.

**Bố cục (người làm tự đặt toạ độ, nhưng phải thoả test):** sàn ~12×9 m; hàng bếp (máy) phía sau `z ≈ -2.5`; hàng kệ + thu ngân ở `z ≈ 0`, mỗi kệ/thu ngân có `customerPoint` ở phía khách (`z ≈ +1.2`); lối vào/ra phía trước bên phải; `queueDir` hướng về phía khách. Không có tìm đường: khách đi thẳng.

- [ ] **Step 1: Viết test thất bại** `content.test.ts`:
  - `every station def / ingredient / item referenced exists`
  - `every display item is sellable and some station in the shop outputs it`
  - `requires references existing instanceIds and the graph is acyclic`
  - `starter set (unlockCost 0) has ≥1 producer, ≥1 display, exactly 1 cashier`
  - `footprints are inside bounds and do not overlap`
  - `customer paths are clear`: các đoạn thẳng entrance→mỗi customerPoint, giữa mọi cặp customerPoint, customerPoint thu ngân→exit, và các ô xếp hàng `cashier.customerPoint + queueDir*QUEUE_SPACING*i` (i<MAX_CUSTOMERS/2) không cắt footprint nào (nở thêm 0.2 m).
  - `BALANCE.START_MONEY === 5_000_000`
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Viết các file content theo bảng trên.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5:** Commit `feat(content): dữ liệu xe bánh mì`.

---

### Task 3: Thế giới, RNG, thời gian trong ngày

**Files:**
- Create: `shared/src/sim/{rng.ts,world.ts,time.ts,events.ts}`
- Test: `shared/test/time.test.ts`, `shared/test/world.test.ts`

**Interfaces:**
- Produces:
```ts
interface StationState { instanceId:string; unlocked:boolean; paid:number; outputCount:number;
  inputs:Partial<Record<ItemId,number>>; stock:number; progress:number; running:boolean;
  blocked:null|'no_money'|'no_input'|'full'; tileOccupant:null|{playerId:string;sec:number} }
interface Customer { id:number; x:number; z:number; dir:number;
  state:'toShelf'|'atShelf'|'toQueue'|'inQueue'|'paying'|'leaving';
  wants:ItemId[]; bill:number; waited:number; payTimer:number; holding:ItemId[]; scored:boolean }
interface ShopState { id:ShopId; stations:Record<string,StationState>; customers:Customer[];
  prices:Partial<Record<ItemId,number>>; ratings:number[]; nextCustomerIn:number; nextCustomerId:number }
interface PlayerState { id:string; name:string; color:number; x:number; z:number; dir:number;
  carry:ItemId[]; carryCap:number; speed:number; online:boolean; input:{mx:number;mz:number}; transferCd:number }
interface DayStats { revenue:number; ingredientCost:number; unlockSpend:number; served:number; lost:number }
interface DaySummary extends DayStats { day:number; operatingProfit:number; stars:number }
interface WorldState { schemaVersion:1; code:string; money:number; day:number; secOfDay:number;
  rngState:number; shops:Record<ShopId,ShopState>; players:Record<string,PlayerState>;
  log:{day:number; clock:string; text:string}[]; dayStats:DayStats }
type SimEvent =
  | { type:'sale'; shopId:ShopId; amount:number; x:number; z:number }
  | { type:'unlock'; shopId:ShopId; instanceId:string; byPlayerId:string }
  | { type:'customerLost'; shopId:ShopId; x:number; z:number }
  | { type:'dayEnd'; summary:DaySummary };
createWorld(code:string, seed:number): WorldState
nextRandom(world:WorldState): number            // [0,1), mulberry32 trên world.rngState
gameClock(secOfDay:number): { hour:number; minute:number }   // 06:00 + secOfDay/360*16h
formatClock(secOfDay:number): string            // "07:30"
advanceTime(world:WorldState, dt:number): DaySummary | null
```

- [ ] **Step 1: Viết test thất bại:**
  - `createWorld('ABC-DEF', 1)`: `money === 5_000_000`, `day === 1`, `secOfDay === 0`; chỉ các trạm `unlockCost 0` có `unlocked === true`; `players` rỗng.
  - `nextRandom` cùng seed → cùng dãy 5 số; khác seed → khác.
  - `gameClock(0)` = 6:00; `gameClock(180)` = 14:00; `formatClock(22.5)` = `"07:00"`.
  - `advanceTime` từ `secOfDay 359` thêm `2` → trả summary `day === 1`, `operatingProfit === revenue - ingredientCost`; sau đó `world.day === 2`, `secOfDay === 0`, `dayStats` về 0, `customers` của mọi shop rỗng.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Cài đặt. Summary cần số sao nên tạo luôn `shared/src/sim/rating.ts` trong task này: `stars(ratings:number[]): number` (trung bình, làm tròn 0.1, rỗng → `DEFAULT_STARS`) và `pushRating(shop:ShopState, score:number): void` (giữ tối đa `RATING_WINDOW` phần tử); thêm test `stars([5,5,1]) === 3.7`, `stars([]) === 3`, đẩy 51 điểm → còn 50.
- [ ] **Step 4:** Chạy → PASS. **Step 5:** Commit `feat(sim): thế giới và thời gian`.

---

### Task 4: Di chuyển + va chạm

**Files:** Create `shared/src/sim/movement.ts` · Test `shared/test/movement.test.ts`

**Interfaces:**
- Produces: `movePlayer(pos:{x:number;z:number;dir:number}, input:{mx:number;mz:number}, speed:number, dt:number, layout:ShopLayout, isSolid:(instanceId:string)=>boolean): {x:number;z:number;dir:number}`
  — input dài >1 thì chuẩn hoá; nhân vật là hình tròn bán kính `PLAYER_RADIUS`, bị đẩy ra khỏi footprint (AABB) của trạm `isSolid` và kẹp trong `bounds`; `dir = atan2(dx, dz)` khi có di chuyển, giữ nguyên khi đứng yên. Trạm chưa mở (chỉ là ô trên sàn) không cứng.

- [ ] **Step 1: Test thất bại:** đi `(1,0)` 0.5 s với speed 3.2 → `x` tăng 1.6; input `(1,1)` → quãng đường = speed·dt (đã chuẩn hoá); đi thẳng vào một trạm cứng → dừng cách mép footprint đúng `PLAYER_RADIUS` (±0.01); đi qua trạm `isSolid=false` → xuyên qua; đi ra ngoài `bounds` → bị kẹp; input `(0,0)` → `dir` giữ nguyên.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): di chuyển và va chạm`.

---

### Task 5: Máy sản xuất (tốn tiền nguyên liệu)

**Files:** Create `shared/src/sim/production.ts` · Test `shared/test/production.test.ts`

**Interfaces:**
- Consumes: `WorldState`, `STATIONS`, `INGREDIENTS`.
- Produces: `tickStations(world:WorldState, shopId:ShopId, dt:number): void`

Quy tắc (spec §7.1): trạm `producer`/`assembler` đã mở, `outputCount < outputCap`, chưa chạy → thử bắt đầu: assembler cần đủ `inputs` (thiếu → `blocked='no_input'`); chi phí = Σ `marketPrice × qty` nguyên liệu; `money < chi phí` → `blocked='no_money'`, không trừ gì; đủ → trừ tiền + cộng `dayStats.ingredientCost`, tiêu input, `running=true`. Chạy đủ `cycleSec` → `outputCount++`, `running=false`. Đầy → `blocked='full'`. Máy chạy không cần người.

- [ ] **Step 1: Test thất bại:**
  - Lò bánh mì: sau `tick 3.0s` → `outputCount 1`, `money` giảm đúng `2000` (trừ lúc bắt đầu, kiểm tra ngay sau tick 0.05 s đầu).
  - Dừng ở `outputCap 8` và `blocked === 'full'`.
  - `money = 1000` → `blocked === 'no_money'`, `money` vẫn `1000`.
  - Bàn BM trứng không input → `'no_input'`; có `banh_mi:1, trung_op:1` → sau 2 s `outputCount 1`, inputs về 0, tiền giảm `1000` (rau).
  - Trạm chưa mở không bao giờ sản xuất.
  - `money` không bao giờ < 0 khi nhiều máy cùng thiếu tiền (money = 2500, lò bánh + chảo cùng muốn chạy → chỉ một máy chạy).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): máy sản xuất`.

---

### Task 6: Bê đồ (tự động khi đứng gần)

**Files:** Create `shared/src/sim/carry.ts` · Test `shared/test/carry.test.ts`

**Interfaces:**
- Produces: `tickCarry(world:WorldState, shopId:ShopId, dt:number): void`; helper `nearestStation(shop, layout, x, z, maxDist): PlacedStation | null` (khoảng cách từ tâm người tới cạnh footprint ≤ `INTERACT_DIST`, chỉ trạm đã mở).

Quy tắc: mỗi người online có `transferCd`; mỗi `TRANSFER_INTERVAL` chuyển tối đa 1 món. **Ưu tiên đặt**: kệ nhận đúng `item` của nó khi `stock < cap`; assembler nhận món là input của nó khi `inputs[item] < inputCap` (lấy món cùng loại gần đỉnh chồng nhất). **Không đặt được thì nhặt**: từ `outputCount` của producer/assembler nếu `carry.length < carryCap`. Chồng đồ được trộn nhiều loại.

- [ ] **Step 1: Test thất bại:** đứng cạnh lò có 8 bánh → sau 1.0 s cầm đúng 4 (carryCap) và lò còn 4; đứng cạnh `ke_banh_mi` cầm `[banh_mi, trung_op]` → kệ +1, còn `[trung_op]`; cạnh bàn BM trứng cầm 8 `banh_mi` → chỉ đặt tới `inputCap 6`; kệ đầy không nhận; người offline không làm gì; đứng xa mọi trạm → không đổi.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): bê đồ`.

---

### Task 7: Ô trả tiền mở rộng (chờ 2 giây)

**Files:** Create `shared/src/sim/payTiles.ts` · Test `shared/test/payTiles.test.ts`

**Interfaces:**
- Produces: `tickPayTiles(world:WorldState, shopId:ShopId, dt:number): SimEvent[]`; `isTileVisible(shop, placed): boolean` (chưa mở và mọi `requires` đã mở).

Quy tắc (spec §12): người online đứng cách tâm ô ≤ `PAY_TILE_RADIUS` là "trên ô". Người đầu tiên lên ô là `tileOccupant`; người khác bị bỏ qua. `sec` cộng dồn; `sec < 2` → không trừ. Sau đó mỗi tick trừ `min(cost·dt/1.5, cost − paid, money)`, cộng `paid` và `dayStats.unlockSpend`. `paid ≥ cost` → `unlocked=true`, `tileOccupant=null`, phát `unlock`. Rời ô hoặc offline → `tileOccupant=null` (đếm lại 2 s lần sau), `paid` giữ nguyên.

- [ ] **Step 1: Test thất bại:**
  - Đi ngang: đứng 1.9 s rồi rời → `money` không đổi, `paid 0`.
  - Đứng 3.5 s trên `chao_op_la` (800K) → mở, `money` giảm đúng `800_000`, có event `unlock` với `byPlayerId`.
  - Đứng 2.75 s → `paid ≈ 400_000` (±1%); rời ô; đứng lại 1.0 s → `paid` không đổi; đứng thêm tới đủ → mở.
  - `money = 300_000`, ô 800K → trừ về 0, chưa mở, `money` không âm.
  - Ô có `requires` chưa mở → không hiện, không trừ.
  - **(Review Focus 1)** Người A đang trừ tiền thì `online=false` → `tileOccupant` về null, `paid` giữ nguyên; người B bước lên phải chờ đủ 2 s mới trừ.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): ô trả tiền 2 giây`.

---

### Task 8: Khách hàng, giá, thu ngân, đánh giá sao

**Files:** Create `shared/src/sim/customers.ts`; Modify `shared/src/sim/rating.ts` · Test `shared/test/customers.test.ts`, `shared/test/rating.test.ts`

**Interfaces:**
- Consumes: `nextRandom`, `pushRating`, `stars`, `SHOPS`, `ITEMS`.
- Produces:
```ts
trafficMultiplier(stars:number): number          // nội suy tuyến tính theo BALANCE.STAR_MULT
hourMultiplier(layout:ShopLayout, hour:number): number   // 0 ngoài hourCurve
priceOf(shop:ShopState, item:ItemId): number     // shop.prices[item] ?? ITEMS[item].basePrice
isCashierManned(world:WorldState, shopId:ShopId): boolean
tickCustomers(world:WorldState, shopId:ShopId, dt:number): SimEvent[]
```

Quy tắc (spec §8): sinh khách khi `nextCustomerIn ≤ 0`, giờ < `LAST_SPAWN_HOUR`, số khách < `MAX_CUSTOMERS`; khoảng cách lần sau ~ phân phối mũ, trung bình `baseCustomerIntervalSec / (hourMultiplier · trafficMultiplier(stars))`. Số món muốn theo `ITEMS_PER_CUSTOMER_WEIGHTS`, chọn theo `demandWeight` trong các món bán được có kệ đã mở; mỗi món giữ lại nếu `priceOf ≤ basePrice × U(WTP_MIN, WTP_MAX)`. Không giữ được món nào → đi về, chấm `SCORE_PRICEY`. Đi tới `customerPoint` từng kệ; kệ có hàng → lấy 1 (`stock--`, `bill += priceOf`), hết hàng → đứng chờ. Xong → xếp hàng thu ngân (vị trí theo `queueDir`). Đầu hàng + `isCashierManned` (một người online cách footprint thu ngân ≤ `INTERACT_DIST`) → sau `CASHIER_SERVICE_SEC`: `money += bill`, `revenue += bill`, `served++`, event `sale`, chấm điểm: `waited ≤ 10` → 5, `≤ 20` → 4, còn lại 3. `waited` chỉ tăng khi đứng chờ (không tính lúc đi). `waited > PATIENCE_SEC` → bỏ về, chấm 1, `lost++`, event `customerLost`, món đang cầm mất luôn. Về tới `exit` → xoá.

- [ ] **Step 1: Test thất bại:**
  - `trafficMultiplier(1)=0.5`, `(3)=1`, `(4.5)=1.575`, `(5)=1.8`.
  - Seed cố định, sao 3, cả ngày 360 s: tổng số khách sinh ra trong khoảng `[60, 130]`; không sinh sau 21:30; không bao giờ > 20 khách cùng lúc.
  - Chỉ mở bánh mì, đặt `prices.banh_mi = K(10)` (gấp đôi) → khách về với điểm 3, `money` không đổi.
  - Kệ có 1 bánh, thu ngân không người → khách chờ; quá 40 s → bỏ về, rating cuối = 1, `lost === 1`.
  - Có người đứng thu ngân → sau khi tới quầy 1 s thì `money += 5000`, `served === 1`, rating 5.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): khách, thu ngân, đánh giá sao`.

---

### Task 9: Vòng tick, người chơi, snapshot, chuẩn hoá khi tải

**Files:** Create `shared/src/sim/{players.ts,tick.ts,snapshot.ts}`, `shared/src/net/protocol.ts` · Test `shared/test/tick.test.ts`, `shared/test/snapshot.test.ts`

**Interfaces:**
- Produces:
```ts
joinPlayer(world, playerId:string, name:string): PlayerState   // tạo mới hoặc lấy lại; online=true; mới thì đứng ở entrance, màu theo bảng 6 màu
leavePlayer(world, playerId:string): void                      // online=false, input=0, nhả tileOccupant
setInput(world, playerId:string, input:{mx:number;mz:number}): void   // NaN/Infinity → 0, kẹp độ dài ≤ 1
tick(world, dt:number): SimEvent[]
toSnapshot(world, shopId:ShopId): Snapshot
normalizeLoaded(raw:unknown): WorldState   // throw nếu schemaVersion ≠ 1
// protocol.ts
const MSG = { input:'input', snapshot:'snap', event:'event', welcome:'welcome' } as const;
interface JoinOptions { code:string; name:string; token:string }
interface Snapshot { day:number; secOfDay:number; money:number; stars:number;
  players:{id:string;name:string;color:number;x:number;z:number;dir:number;carry:ItemId[];online:boolean}[];
  customers:{id:number;x:number;z:number;dir:number;holding:ItemId[]}[];
  stations:{instanceId:string;unlocked:boolean;outputCount:number;stock:number;inputs:Partial<Record<ItemId,number>>;blocked:StationState['blocked']}[];
  tiles:{instanceId:string;cost:number;paid:number;occupantSec:number}[];   // chỉ ô đang hiện
  log:WorldState['log'] }
```
`tick`: không ai online → trả `[]`, không đổi gì. `dt` kẹp ≤ `MAX_TICK_DT`, chia bước ≤ `SUBSTEP_DT`; mỗi bước: di chuyển người (dùng `movePlayer`, trạm cứng = đã mở) → `tickCarry` → `tickPayTiles` → `tickStations` → `tickCustomers` → `advanceTime`. Event `unlock` → thêm log `"{tên} đã mở {tên trạm}"` (giữ 30 dòng). `dayEnd` phát kèm summary.
`normalizeLoaded`: xoá khách, mọi người `online=false`, `input` 0, `tileOccupant` null, `running` giữ nguyên.

- [ ] **Step 1: Test thất bại:**
  - Không ai online → `tick(world, 10)` không đổi `secOfDay`.
  - `tick(world, 5)` với 1 người online → `secOfDay` tăng đúng `1.0`.
  - `setInput` với `NaN` → `{mx:0,mz:0}`; `(3,4)` → độ dài 1.
  - `joinPlayer` cùng id lần 2 → giữ `carry` và vị trí cũ, không tạo người mới.
  - **Bot cả ngày** (seed 42): người A lặp "tay trống → đi tới lò bánh mì; tay có đồ → đi tới `ke_banh_mi`", người B đứng ở thu ngân; chạy `tick(world, 0.05)` 7200 lần (đặt input hướng tới mục tiêu mỗi bước). Kỳ vọng: đúng 1 event `dayEnd`, summary `revenue > 0`, `served ≥ 20`, và `money ≥ 0` ở **mọi** bước (Review Focus 2).
  - **(Review Focus 4)** `normalizeLoaded(JSON.parse(JSON.stringify(worldGiữaNgày)))` → `customers` rỗng, mọi người offline, mọi `tileOccupant` null, `money/day/secOfDay` giữ nguyên; `normalizeLoaded({...w, schemaVersion: 99})` → throw.
  - `toSnapshot` chỉ chứa ô đang hiện (`isTileVisible`).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS (`npx vitest run shared`). **Step 5:** Commit `feat(sim): vòng tick, snapshot`.

---

### Task 10: Mã phòng + lưu trữ

**Files:** Create `shared/src/codes.ts` (client cũng dùng), `server/package.json`, `server/tsconfig.json`, `server/src/persistence/{worldStore.ts,memoryWorldStore.ts,pgWorldStore.ts}` · Test `shared/test/codes.test.ts`, `server/test/store.test.ts`

**Interfaces:**
- Produces:
```ts
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
generateCode(rand?:()=>number): string            // "ABC-DEF"
normalizeCode(input:string): string | null        // bỏ khoảng trắng/gạch, viết hoa, đúng 6 ký tự trong alphabet → "ABC-DEF"
interface WorldStore { create(world:WorldState):Promise<void>; load(code:string):Promise<unknown|null>;
  save(world:WorldState):Promise<void>; exists(code:string):Promise<boolean> }
createStore(env:{DATABASE_URL?:string}): WorldStore   // không có URL → Memory + cảnh báo console
```
Bảng Postgres (tạo khi khởi động nếu chưa có):
```sql
CREATE TABLE IF NOT EXISTS worlds (
  code text PRIMARY KEY, schema_version int NOT NULL, state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
```
`save` = upsert. Kết nối Neon dùng `pg` `Pool` với `ssl: { rejectUnauthorized: true }` khi URL có `sslmode=require`.

- [ ] **Step 1: Test thất bại:** `generateCode()` khớp `/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/`; **(Review Focus 5)** `normalizeCode(' abc def ')`, `normalizeCode('abcdef')`, `normalizeCode('ABC-DEF')` đều `=== 'ABC-DEF'`; `normalizeCode('abc')`, `normalizeCode('ABC-DE0')` → `null`; Memory store: create → load trả state bằng nhau, save đè; Pg store cùng các test đó trong `describe.skipIf(!process.env.TEST_DATABASE_URL)`.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt (`pg` vào dependencies server). **Step 4:** PASS. **Step 5:** Commit `feat(server): mã phòng, lưu trữ`.

---

### Task 11: Server Colyseus + phòng thế giới

**Files:** Create `server/src/app.ts`, `server/src/index.ts`, `server/src/rooms/WorldRoom.ts` · Test `server/test/room.test.ts`

**Interfaces:**
- Consumes: `tick`, `joinPlayer`, `leavePlayer`, `setInput`, `toSnapshot`, `normalizeLoaded`, `createWorld`, `MSG`, `JoinOptions`, `WorldStore`, `generateCode`, `normalizeCode`.
- Produces: `createGameServer(store:WorldStore): { httpServer: http.Server; gameServer: Server }`; HTTP: `GET /health` → `200 {"ok":true}`; `POST /api/worlds` → `201 {"code":"ABC-DEF"}` (tạo world mới, seed ngẫu nhiên, thử lại nếu trùng mã); static `client/dist` + fallback `index.html`. Phòng `"world"`, `filterBy(['code'])`, `maxClients = MAX_PLAYERS`.

Hành vi `WorldRoom`:
- `onCreate({code})`: `code !== normalizeCode(code)` → throw `Error('INVALID_CODE')` (client luôn chuẩn hoá trước khi join, nếu không `filterBy` sẽ tách thành hai phòng); `load` → không có → throw `Error('WORLD_NOT_FOUND')`; `normalizeLoaded`. `setSimulationInterval` 50 ms gọi `tick(world, dt/1000)`; event gửi bằng `broadcast(MSG.event, e)`; `dayEnd` → lưu. `clock.setInterval` 100 ms → `broadcast(MSG.snapshot, toSnapshot(world,'banh_mi'))`. Tự lưu mỗi `AUTOSAVE_SEC`.
- `onJoin(client, {name, token})`: `playerId = sha256(token).slice(0,12)`; tên trim, cắt 16 ký tự, rỗng → `"Người chơi"`; **(Review Focus 3)** client cũ cùng `playerId` → `oldClient.leave(4001)` trước; `joinPlayer`; `client.send(MSG.welcome, {playerId, code})`.
- `onMessage(MSG.input)` → `setInput`.
- `onLeave(client, consented)`: không chủ động → `allowReconnection(client, RECONNECT_SEC)`, hết hạn → `leavePlayer`; chủ động → `leavePlayer`. Client bị đá vì trùng token thì **không** `leavePlayer` (người mới đã chiếm).
- `onDispose` → lưu.

- [ ] **Step 1: Test thất bại** (khởi động server cổng ngẫu nhiên với `MemoryWorldStore`, dùng `colyseus.js` + `fetch`):
  - `GET /health` → 200 `{ok:true}`.
  - `POST /api/worlds` → mã đúng định dạng.
  - Hai client cùng mã (client thứ hai lấy mã từ `normalizeCode("abc def")` với mã dạng thường) → trong 500 ms snapshot có 2 người `online`; join với mã chưa chuẩn hoá `"abc def"` → reject `INVALID_CODE`.
  - Mã không tồn tại → `joinOrCreate` reject.
  - Cùng token hai lần → client đầu nhận `onLeave` code `4001`; snapshot chỉ còn 1 người online.
  - Cả hai rời (consented) → `store.load(code)` có `players` đều `online:false` sau khi phòng đóng.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt (`colyseus`, `express`, `tsx` vào dependencies; `colyseus.js` vào devDependencies cho test). `index.ts`: `PORT` từ env (mặc định 2567), `createStore(process.env)`. **Step 4:** PASS. **Step 5:** Commit `feat(server): phòng thế giới Colyseus`.

---

### Task 12: Client — sảnh vào game, kết nối, bàn phím

**Files:** Create `client/package.json`, `client/index.html`, `client/vite.config.ts`, `client/src/{main.ts,lobby.ts,net.ts,input.ts,style.css}` · Test `client/test/input.test.ts`

**Interfaces:**
- Produces:
```ts
connect(opts:JoinOptions): Promise<GameConnection>
interface GameConnection { playerId:string; code:string;
  onSnapshot(cb:(s:Snapshot)=>void):void; onEvent(cb:(e:SimEvent)=>void):void;
  sendInput(mx:number, mz:number):void; leave():void }
keysToWorld(keys:{up:boolean;down:boolean;left:boolean;right:boolean}): {mx:number;mz:number}
createKeyboardInput(): { read(): {mx:number;mz:number}; dispose():void }
```
- URL server: dev `ws://localhost:2567`, prod `location.origin` đổi `http`→`ws`. Vite dev proxy `/api` → `http://localhost:2567`.
- Camera nghiêng 45° nên "lên" trên màn hình = hướng thế giới `(-√½, -√½)`; phải = `(√½, -√½)`.
- Sảnh (tiếng Việt): ô "Tên của bạn"; nút "Tạo quán mới" (POST `/api/worlds` rồi vào); ô "Mã quán" + nút "Vào quán"; lỗi `WORLD_NOT_FOUND` → "Không tìm thấy quán với mã này"; mất kết nối → "Đang kết nối lại…". `localStorage` (bọc try/catch) nhớ tên, `token` (`crypto.randomUUID()`), mã quán gần nhất. Mã luôn qua `normalizeCode` (từ `@qnm/shared`) trước khi join; không hợp lệ → "Mã quán gồm 6 ký tự, ví dụ ABC-DEF".
- Gửi input khi thay đổi và mỗi 100 ms.

- [ ] **Step 1: Test thất bại:** `keysToWorld({up:true,...})` ≈ `(-0.707,-0.707)`; `up+right` ≈ `(0,-1)`; không phím → `(0,0)`; `up+down` → `(0,0)`.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt; tạm hiển thị dòng chữ "Đã vào quán ABC-DEF · N người online · 💰 5.000K" để kiểm tra kết nối.
- [ ] **Step 4:** PASS; chạy `npm run dev` (server + vite đồng thời) → mở 2 cửa sổ trình duyệt, tạo quán ở cửa sổ 1, nhập mã ở cửa sổ 2 → cả hai thấy "2 người online".
- [ ] **Step 5:** Commit `feat(client): sảnh và kết nối`.

---

### Task 13: Client — cảnh 3D, nội suy, dự đoán

**Files:** Create `client/src/render/{scene.ts,camera.ts,stations.ts,characters.ts,items.ts,payTiles.ts}`, `client/src/game/{gameLoop.ts,interp.ts,prediction.ts}` · Test `client/test/interp.test.ts`, `client/test/prediction.test.ts`

**Interfaces:**
- Consumes: `Snapshot`, `GameConnection`, `movePlayer`, `SHOPS`, `STATIONS`, `ITEMS`, `BALANCE`.
- Produces:
```ts
createInterpolator(delayMs?:number): { push(s:Snapshot, at:number):void; sample(now:number): Snapshot | null }  // mặc định 100 ms; nội suy x,z,dir của players/customers theo id
createPredictor(): { step(input:{mx:number;mz:number}, dt:number, solid:(id:string)=>boolean): {x:number;z:number;dir:number};
  reconcile(server:{x:number;z:number}): void }   // lệch > 1.5 m → nhảy thẳng; lệch nhỏ → kéo dần 10%/khung
createItemMesh(item:ItemId): THREE.Object3D       // dùng chung geometry/material
startGame(conn:GameConnection, container:HTMLElement): void
```
Hình (như bản mô phỏng đã duyệt): sàn caro, tường sau có biển "BÁNH MÌ NÓNG GIÒN"; `MeshLambertMaterial` + `flatShading`; nhân vật khối trụ + đầu cầu, **người chơi đội nón lá**, nhãn tên phía trên; chồng đồ trước ngực; máy hiện món ở ô đầu ra, kệ hiện số món đang bày, bàn ghép hiện input; trạm `blocked='no_money'` hiện biểu tượng 💸; trạm chưa mở chỉ hiện **ô trả tiền**: viền vuông + giá (`formatK`) + vòng đếm 2 s (trắng) rồi thanh trả tiền (xanh) từ `occupantSec`, `paid/cost`. Camera đi theo người chơi, lăn chuột zoom (kẹp). Người chơi của mình vẽ theo predictor, người khác và khách vẽ theo interpolator.

- [ ] **Step 1: Test thất bại:** interpolator: hai snapshot t=0 (x=0) và t=100 (x=2), `sample(150)` với delay 100 → x=1; chỉ có 1 snapshot → trả snapshot đó; predictor: lệch 2 m → sau `reconcile` vị trí = server; lệch 0.5 m → tiến 10% về server.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt.
- [ ] **Step 4:** PASS; kiểm tra tay với 2 cửa sổ: đi lại mượt, bê bánh từ lò ra kệ, khách tới mua, một người đứng thu ngân thì khách trả tiền, đứng ô "Chảo ốp la" 2 s rồi tiền chảy dần và máy xuất hiện ở cả hai cửa sổ. DevTools → Performance: ~60 FPS trên MacBook Air M1 khi có 20 khách.
- [ ] **Step 5:** Commit `feat(client): cảnh 3D`.

---

### Task 14: Client — HUD, nhật ký, tổng kết ngày

**Files:** Create `client/src/ui/{hud.ts,eventLog.ts,daySummary.ts,floatText.ts}` · Test `client/test/hud.test.ts`

**Interfaces:**
- Produces: `hudText(s:Snapshot): { money:string; clock:string; stars:string; online:string }` → ví dụ `{money:'💰 2.987,5K', clock:'Ngày 1 · 07:30', stars:'★ 3,7', online:'Bố, Mẹ'}`; `summaryRows(d:DaySummary): [string,string][]` → `['Doanh thu','1.250K'], ['Tiền nguyên liệu','-480K'], ['Lãi hoạt động','770K'], ['Chi mở rộng','-800K'], ['Khách đã phục vụ','86'], ['Khách bỏ về','4'], ['Đánh giá','★ 4,2']`.
- Thanh trên: tiền, ngày-giờ, sao, ai online. Góc phải: 5 dòng nhật ký gần nhất (từ `snapshot.log`). Chữ nổi `+25K` màu xanh tại vị trí event `sale`, `-1★` đỏ tại `customerLost`. Event `dayEnd` → bảng tổng kết giữa màn hình, đóng khi bấm hoặc sau 8 s (game không dừng).

- [ ] **Step 1: Test thất bại** cho `hudText` và `summaryRows` với đúng các chuỗi trên (dấu phẩy thập phân cho sao).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS; kiểm tra tay: hết ngày (6 phút) thấy bảng tổng kết ở cả hai cửa sổ.
- [ ] **Step 5:** Commit `feat(client): HUD và tổng kết ngày`.

---

### Task 15: Build production + deploy Render

**Files:** Modify `package.json`; Create `render.yaml`, `README.md`

**Interfaces:**
- Root scripts: `build` = `npm run typecheck && npm run build -w @qnm/client`; `start` = `tsx server/src/index.ts`; `dev` = chạy song song server (`tsx watch`) và `vite` (dùng `concurrently`).
- `render.yaml`: 1 web service `quan-nha-minh`, `runtime: node`, `region: singapore`, `plan: free`, `buildCommand: npm ci --include=dev && npm run build`, `startCommand: npm start`, `healthCheckPath: /health`, envVars `NODE_ENV=production`, `DATABASE_URL` (`sync: false`).
- `README.md` (tiếng Việt): chạy thử trên máy (`cp .env.example .env`, `npm install`, `npm run dev`), chạy test, deploy Render (đúng các bước đã hướng dẫn chủ dự án, **build command có `--include=dev`**), lưu ý gói free (ngủ sau 15 phút, chờ ~1 phút).

- [ ] **Step 1:** Kiểm tra giống môi trường Render: `rm -rf node_modules && NODE_ENV=production npm ci --include=dev && npm run build && NODE_ENV=production PORT=3000 npm start` → `curl -s localhost:3000/health` in `{"ok":true}`; mở `http://localhost:3000` thấy sảnh; tạo quán và vào được.
- [ ] **Step 2:** `npm test` toàn bộ → PASS; `npm run typecheck` → 0 lỗi.
- [ ] **Step 3:** Commit `chore: build production và cấu hình Render`.
- [ ] **Step 4:** Nếu chủ dự án đã gửi link repo GitHub và `gh auth status` OK: `git remote add origin <link>` → `git push -u origin main`. Nếu chưa, dừng và nhắc chủ dự án làm Bước 1 trong hướng dẫn.
- [ ] **Step 5:** Sau khi chủ dự án tạo Web Service trên Render: mở `https://<tên>.onrender.com/health` → `{"ok":true}`; hai máy (MacBook Air M1 + Acer Nitro 5) vào cùng mã, chơi 1 ngày; tắt hết, đợi 1 phút, vào lại → tiền và các máy đã mở còn nguyên.
