# Kế hoạch 2 — Tiện chơi + Quản lý quán Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm thùng rác, giãn bố cục, hiện số món đang cầm, nhặt món 0,45 s/món, âm thanh, và menu (Báo cáo từng ngày, Nhân sự thuê/sa thải có nhân viên tự làm việc, Giá bán, Cài đặt).

**Architecture:** Giữ nguyên kiến trúc Kế hoạch 1: mọi luật chơi mới (thùng rác, nhặt chậm, nhân viên, lương, giá, lịch sử ngày) nằm trong `shared/src/sim` thuần TypeScript có test; server chỉ thêm message gọi các hàm đó; client thêm UI menu (HTML chồng lên canvas), nhãn số món, âm thanh Web Audio. File lưu nâng `schemaVersion` 1 → 2 có hàm chuyển đổi.

**Tech Stack:** như Kế hoạch 1 (TypeScript, Vitest, Colyseus 0.18 core + @colyseus/sdk, Three.js, Vite). Âm thanh: Web Audio API (không thư viện).

**Spec:** `docs/superpowers/specs/2026-11-17-quan-an-viet-design.md` + bổ sung `docs/superpowers/specs/2026-11-17-ke-hoach-2-quan-ly-design.md`

## Global Constraints

- Mọi Global Constraints của Kế hoạch 1 vẫn áp dụng (tiền số nguyên đồng + `formatK`, tiếng Việt, không bóng đổ, sim thuần trong `shared`, số liệu trong `shared/src/content`, thời gian chỉ chạy khi có người online, tối đa 4 người).
- Nhặt từ máy **0,45 s/món** (`PICK_INTERVAL`); đặt/bỏ rác **0,2 s/món** (`DROP_INTERVAL`).
- Nhân viên: lương **300K/ngày** (`WAGE`), tốc độ **70%** người chơi (`STAFF_SPEED = 2.24`), mang tối đa **3** món (`STAFF_CARRY`). Thu ngân tối đa 1; phụ bếp tối đa 1 người / món đang có kệ mở.
- Giá bán cho phép **50%–200%** giá thị trường, bước **500đ**.
- Vùng nhặt/đặt đồ (`INTERACT_DIST` 0,6 m quanh footprint) của hai trạm bất kỳ **không chồng nhau**.
- `schemaVersion` mới là **2**; file lưu version 1 phải tải được.
- Âm lượng/tắt tiếng lưu `localStorage` (bọc try/catch), mặc định nhạc 0.3, hiệu ứng 0.7.

## Review Focus

1. **File lưu cũ (v1) có người đứng ở toạ độ cũ, nay nằm trong một máy ở bố cục mới** → tải được, nhân vật bước ra được ngay. (Test ở Task 2: `normalizeLoaded` v1 → v2 và `movePlayer` đẩy ra khỏi footprint.)
2. **Tiền không âm khi trả lương cuối ngày** dù thiếu tiền → trả được ai thì trả, người còn lại nghỉ việc, `money ≥ 0`. (Test ở Task 5.)
3. **Hai người cùng thuê/đổi giá cùng lúc** (2 message trong 1 tick) → không vượt số chỗ, không trùng phụ bếp cùng món. (Test ở Task 6 gọi `hireStaff` hai lần liên tiếp.)
4. **Giá gửi lên linh tinh** (NaN, âm, 10 tỷ, số lẻ 4.321đ) → bị kẹp về khoảng cho phép, làm tròn 500đ, không crash. (Test ở Task 4.)
5. **Mở menu khi đang giữ phím đi** → nhân vật dừng lại, không tiếp tục chạy sau lưng menu. (Test ở Task 13: `createKeyboardInput().setEnabled(false)` → `read()` = 0.)

---

## Cấu trúc file (mới / sửa)

```
shared/src/content/shops/banhMi.ts   SỬA: bố cục 16×11, workPoint mỗi trạm, thùng rác
shared/src/content/stations.ts       SỬA: kind 'trash', PlacedStation.workPoint
shared/src/content/balance.ts        SỬA: PICK_INTERVAL, DROP_INTERVAL, STAFF_*, WAGE, HISTORY_DAYS, STAFF_DOOR, STAFF_NAMES
shared/src/content/costs.ts          MỚI: itemCost()
shared/src/sim/world.ts              SỬA: v2 types (staff, history, stats, pickTimer)
shared/src/sim/migrate.ts            MỚI: migrateV1toV2()
shared/src/sim/carry.ts              SỬA: nhặt chậm, đặt nhanh, thùng rác
shared/src/sim/prices.ts             MỚI: setPrice(), priceRange()
shared/src/sim/staff.ts              MỚI: hireStaff, fireStaff, tickStaff, payWages
shared/src/sim/report.ts             MỚI: buildReport()
shared/src/sim/{time,customers,players,tick,snapshot,events}.ts  SỬA
shared/src/net/protocol.ts           SỬA: message mới, Snapshot v2, Report
server/src/rooms/WorldRoom.ts        SỬA: handler hire/fire/setPrice/rename/getReport
client/src/audio/{engine.ts,cues.ts,music.ts}   MỚI
client/src/ui/menu/{menu.ts,reportTab.ts,staffTab.ts,pricesTab.ts,settingsTab.ts,format.ts}  MỚI
client/src/settings.ts               MỚI: đọc/ghi cài đặt localStorage
client/src/render/{characters.ts,stations.ts,scene.ts}  SỬA
client/src/{input.ts,main.ts,net.ts} SỬA
```

---

### Task 1: Bố cục mới + thùng rác + workPoint

**Files:** Modify `shared/src/content/{stations.ts,balance.ts,shops/banhMi.ts}`; Test `shared/test/content.test.ts`; Modify các test dùng toạ độ cứng: `shared/test/{carry,payTiles,customers,tick,movement}.test.ts`, `shared/test/helpers.ts`

**Interfaces:**
- Produces: `StationDef` thêm `{ kind:'trash'; id:'thung_rac'; name:'Thùng rác'; footprint:{w:0.6,d:0.6} }`; `PlacedStation.workPoint: {x:number; z:number}` (chỗ người/nhân viên đứng dùng trạm, phía bếp); helper test `standAt(instanceId): {x,z}` = `getPlaced('banh_mi', id).workPoint`.

**Bố cục (đồng bộ test):** `bounds {minX:-8,maxX:8,minZ:-5.5,maxZ:5.5}`; hàng máy `z = -3.8` x lần lượt `lo_banh_mi -6.25, chao_op_la -3.75, ban_bm_trung -1.25, lo_than 1.25, ban_bm_thit 3.75, binh_tra 6.25`; hàng kệ `z = 0`: `ke_banh_mi -6.25, ke_bm_trung -3.75, ke_thit_nuong -1.25, ke_bm_thit 1.25, ke_tra_da 3.75, thu_ngan 6.25`; `customerPoint` z = 1.2; `thung_rac (-7.6, -1.85)` unlockCost 0; `entrance (7.5, 5.2)`, `exit (-7.5, 5.3)`, `queueDir (0,1)`. `workPoint`: máy `(x, -2.9)`, kệ/thu ngân `(x, -0.85)`, thùng rác `(-7.6, -1.2)`. Giá mở khoá và `requires` giữ nguyên Kế hoạch 1.

- [ ] **Step 1: Test thất bại** thêm vào `content.test.ts`:
  - `pick-up zones of any two stations do not overlap` (khoảng cách giữa hai footprint > `2 × INTERACT_DIST`).
  - `every workPoint is within INTERACT_DIST of its own station and outside every other station's zone`.
  - `the trash bin exists, costs nothing and is not reachable from any other station's zone`.
  - `staff route between any two kitchen/shelf workPoints does not cross a footprint` (đoạn thẳng giữa mọi cặp workPoint trừ thùng rác).
- [ ] **Step 2:** `npx vitest run shared/test/content.test.ts` → FAIL.
- [ ] **Step 3:** Sửa content theo toạ độ trên. Sửa các test cũ dùng toạ độ cứng sang `standAt(...)`/`getPlaced(...)` (bot cả ngày ở `tick.test.ts`: lối vào bếp đi qua khe giữa `ke_banh_mi` và `ke_bm_trung` tại `x = -5.0`).
- [ ] **Step 4:** `npx vitest run` → toàn bộ PASS.
- [ ] **Step 5:** Commit `feat(content): giãn bố cục, thùng rác, workPoint`.

---

### Task 2: Kiểu dữ liệu v2 + chuyển đổi file lưu

**Files:** Modify `shared/src/sim/{world.ts,snapshot.ts}`; Create `shared/src/sim/migrate.ts`; Test `shared/test/migrate.test.ts`

**Interfaces:**
- Produces:
```ts
type StaffRole = 'cashier' | 'cook';
interface StaffTask { from: string; to: string; item: ItemId; phase: 'toSource'|'picking'|'toTarget'|'dropping' }
interface StaffState { id: string; name: string; role: StaffRole; item: ItemId | null; x: number; z: number; dir: number;
  carry: ItemId[]; task: StaffTask | null; timer: number; hiredDay: number }
// ShopState thêm: staff: StaffState[]; nextStaffId: number; firedToday: number
// DayStats thêm: wages: number; wasted: number; sold: Partial<Record<ItemId, number>>
// PlayerState: transferCd → dropCd; thêm pickTimer: number; pickAt: string | null
// WorldState: schemaVersion: 2; thêm history: DaySummary[]
migrateV1toV2(raw: any): any            // thêm mặc định, đổi tên trường, schemaVersion = 2
normalizeLoaded(raw): WorldState        // chấp nhận 1 (gọi migrate) hoặc 2; khác → throw 'UNSUPPORTED_SCHEMA'
```
- [ ] **Step 1: Test thất bại** `migrate.test.ts`: một object v1 tối thiểu (tạo bằng JSON cố định trong test: có `transferCd`, không có `staff/history/wages`) → `normalizeLoaded` trả `schemaVersion 2`, `shops.banh_mi.staff === []`, `history === []`, `dayStats.wages === 0`, `dayStats.sold` là `{}`, `players.a.dropCd === 0`, `pickTimer === 0`; **(Review Focus 1)** người chơi v1 lưu ở `(-6.25, -3.8)` (nằm trong footprint `lo_banh_mi` của bố cục mới) → sau 1 bước `movePlayer` với input `(0, 1)` thì ra ngoài footprint; `schemaVersion: 3` → throw.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt; `createWorld` tạo đủ trường v2. **Step 4:** `npx vitest run` PASS (sửa các test cũ dùng `transferCd` → `dropCd`). **Step 5:** Commit `feat(sim): file lưu v2`.

---

### Task 3: Nhặt chậm, đặt nhanh, thùng rác

**Files:** Create `shared/src/content/costs.ts`; Modify `shared/src/sim/{carry.ts,events.ts}`, `shared/src/content/balance.ts`; Test `shared/test/carry.test.ts`, `shared/test/costs.test.ts`

**Interfaces:**
- Produces: `itemCost(item: ItemId): number` (đồng; producer = Σ nguyên liệu; assembler = nguyên liệu + Σ itemCost(input)); `SimEvent` thêm `{ type:'trash'; shopId; playerId: string; item: ItemId; value: number; x: number; z: number }`.
- `BALANCE`: `PICK_INTERVAL = 0.45`, `DROP_INTERVAL = 0.2` (bỏ `TRANSFER_INTERVAL`), `STILL_INPUT = 0.05` (chuyển hằng số từ `payTiles.ts` sang đây).

Quy tắc mỗi người online (đứng gần trạm theo `nearestStation`):
1. Có món để **đặt** (kệ đúng món còn chỗ / bàn ghép cần món đó) → mỗi `DROP_INTERVAL` đặt 1; `pickTimer = 0`.
2. Trạm là **thùng rác** và người **đứng yên** (`|input| ≤ STILL_INPUT`) và đang cầm đồ → mỗi `DROP_INTERVAL` bỏ món trên cùng: `dayStats.wasted += itemCost`, event `trash`.
3. Ngược lại, trạm có `outputCount > 0` và còn chỗ trên tay → `pickAt = instanceId`, `pickTimer += dt`; đủ `PICK_INTERVAL` → nhặt 1, `pickTimer -= PICK_INTERVAL`.
4. Không có gì → `pickTimer = 0`, `pickAt = null`.

- [ ] **Step 1: Test thất bại:** `itemCost('banh_mi') === 2000`, `itemCost('banh_mi_trung') === 6000` (2K + 3K + 1K rau), `itemCost('banh_mi_thit') === 9000`; đứng cạnh lò có 8 bánh: sau 0.40 s cầm 0, sau 0.45 s cầm 1, sau 1.80 s cầm 4; bước ra sau 1.0 s → cầm đúng 2 và `pickTimer` về 0; đặt 4 bánh lên kệ mất ≤ 0.8 s; đứng yên cạnh thùng rác cầm `[banh_mi, banh_mi_trung]` → sau 0.4 s tay trống, `wasted === 8000`, 2 event `trash`; **đi ngang** thùng rác (input ≠ 0) → không mất món nào.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npx vitest run` PASS (cập nhật bot `tick.test.ts` nếu cần thêm thời gian). **Step 5:** Commit `feat(sim): nhặt dần 0,45s, thùng rác`.

---

### Task 4: Giá bán + đổi tên + đếm món bán

**Files:** Create `shared/src/sim/prices.ts`; Modify `shared/src/sim/{customers.ts,players.ts}`; Test `shared/test/prices.test.ts`

**Interfaces:**
- Produces:
```ts
type ActionResult = { ok: true } | { ok: false; error: 'BAD_ITEM' | 'NO_SLOT' | 'LINE_TAKEN' | 'NOT_FOUND' | 'BAD_ROLE' };
priceRange(item: ItemId): { min: number; max: number; step: 500; base: number }   // 50%–200% base, làm tròn 500đ
setPrice(world, shopId, item: ItemId, price: unknown, byPlayerId: string): ActionResult
renamePlayer(world, playerId: string, name: unknown): void                         // trim, ≤16 ký tự, rỗng → giữ tên cũ
```
`setPrice`: item không bán được hoặc không có kệ đã mở → `BAD_ITEM`; giá không phải số hữu hạn → giữ nguyên, `ok:true` không đổi gì; kẹp vào `[min,max]`, làm tròn bội số 500; ghi log `"Bố đổi giá Bánh mì: 5K → 6K"` (không ghi nếu giá không đổi). Khi khách trả tiền: `dayStats.sold[item] += 1` cho mỗi món họ cầm.
- [ ] **Step 1: Test thất bại (Review Focus 4):** `priceRange('banh_mi')` = `{min:2500,max:10000,step:500,base:5000}`; `setPrice(..., 6000)` → `priceOf === 6000` + log đúng chuỗi; `NaN` → không đổi; `-5` → 2500; `1e10` → 10000; `4321` → 4500; `'banh_mi_thit'` khi kệ chưa mở → `BAD_ITEM`; khách mua 1 bánh mì → `dayStats.sold.banh_mi === 1`; `renamePlayer` cắt 16 ký tự, `'  '` giữ tên cũ.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): đổi giá bán`.

---

### Task 5: Cuối ngày v2: trả lương, lịch sử ngày

**Files:** Modify `shared/src/sim/{time.ts,world.ts}`; Create phần `payWages` trong `shared/src/sim/staff.ts`; Test `shared/test/time.test.ts`, `shared/test/wages.test.ts`

**Interfaces:**
- Produces: `payWages(world): { paid: number; quitNames: string[] }` — mỗi shop: trả `firedToday × WAGE` trước (thiếu tiền thì bỏ qua phần còn lại), rồi từng nhân viên theo thứ tự thuê: đủ `WAGE` thì trả, thiếu thì **nghỉ việc** (xoá khỏi `staff`, log `"Lan nghỉ việc vì không được trả lương"`); cộng `dayStats.wages`; `firedToday = 0`.
- `DaySummary` = `DayStats & { day; operatingProfit: revenue − ingredientCost − wages; stars }`. `advanceTime` khi hết ngày: `payWages` → tạo summary → `world.history.push(summary)` (giữ `HISTORY_DAYS = 30`) → reset.
- `BALANCE.WAGE = K(300)`, `HISTORY_DAYS = 30`.
- [ ] **Step 1: Test thất bại:** 2 nhân viên, tiền dư → cuối ngày `money −= 600_000`, `summary.wages === 600_000`, `operatingProfit` trừ lương; `history.length === 1` và bằng summary; 31 ngày → `history.length === 30`; **(Review Focus 2)** tiền 400K, 2 nhân viên → trả 1 người, người còn lại nghỉ việc, `money === 100_000`, log nghỉ việc; sa thải hôm nay 1 người (`firedToday = 1`) → vẫn bị tính 300K.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): trả lương, lịch sử ngày`.

---

### Task 6: Thuê / sa thải

**Files:** Modify `shared/src/sim/staff.ts`, `shared/src/content/balance.ts`; Test `shared/test/staff.test.ts`

**Interfaces:**
- Produces:
```ts
staffSlots(world, shopId): { cashier: { max: 1; used: number }; cookLines: { item: ItemId; taken: string | null }[] }
hireStaff(world, shopId, role: StaffRole, item: ItemId | null, byPlayerId: string): ActionResult
fireStaff(world, shopId, staffId: string, byPlayerId: string): ActionResult
```
Luật: `cashier` khi đã có 1 → `NO_SLOT`; `cook` cần `item` là món có kệ đã mở (khác → `BAD_ITEM`), món đã có phụ bếp → `LINE_TAKEN`; role khác → `BAD_ROLE`. Nhân viên mới xuất hiện ở `BALANCE.STAFF_DOOR = {x:0, z:-1.85}`, tên lấy lần lượt từ `STAFF_NAMES = ['Lan','Hùng','Mai','Tuấn','Hoa','Nam','Thảo','Dũng']` (không trùng tên đang làm), `hiredDay = world.day`. Log: `"Mẹ đã thuê Lan (thu ngân)"`, `"Mẹ đã thuê Hùng (phụ bếp Bánh mì)"`, `"Bố đã cho Lan nghỉ"`. `fireStaff` → xoá, `firedToday += 1`, món đang cầm mất.
- [ ] **Step 1: Test thất bại:** thuê thu ngân 2 lần liên tiếp → lần 2 `NO_SLOT` (**Review Focus 3**); thuê phụ bếp `banh_mi` 2 lần → `LINE_TAKEN`; `banh_mi_thit` khi kệ chưa mở → `BAD_ITEM`; `staffSlots` liệt kê đúng các món có kệ mở; sa thải → `firedToday 1`, log; sa thải id lạ → `NOT_FOUND`.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): thuê và sa thải`.

---

### Task 7: Nhân viên tự làm việc

**Files:** Modify `shared/src/sim/{staff.ts,customers.ts,tick.ts}`, `shared/src/content/balance.ts`; Test `shared/test/staffAi.test.ts`

**Interfaces:**
- Produces: `tickStaff(world, shopId, dt): void`; `isCashierManned` cũng đúng khi thu ngân **đã đứng** tại `workPoint` của `thu_ngan`.
- `BALANCE.STAFF_SPEED = 2.24`, `STAFF_CARRY = 3`.

Hành vi (đi thẳng giữa các `workPoint`, lối bếp đã được Task 1 bảo đảm không vướng):
- **Thu ngân:** đi tới `workPoint` của `thu_ngan` rồi đứng đó.
- **Phụ bếp món X** (kệ `S`): khi tay trống chọn việc theo thứ tự:
  1. Trạm làm ra X (producer hoặc assembler) có `outputCount > 0` và `S.stock < cap` → bê X từ trạm đó → `S`.
  2. Nếu X do bàn ghép `A` làm: với mỗi input của A còn `< inputCap`, producer của input đó có hàng → bê input đó → `A` (ưu tiên input ít nhất).
  3. Không có việc → đứng chờ ở `workPoint` của trạm làm ra X.
- Mỗi chuyến: đi tới `from` → nhặt theo `PICK_INTERVAL` tới khi đủ `min(STAFF_CARRY, chỗ trống ở đích, hàng có)` hoặc hết hàng → đi tới `to` → đặt theo `DROP_INTERVAL`. Món còn thừa trên tay (đích đầy) → giữ, lần sau đem tới chỗ nhận được, không đem vứt.
- `tick` gọi `tickStaff` sau `tickCarry`. Nhân viên không kích hoạt ô trả tiền, không dùng thùng rác.
- [ ] **Step 1: Test thất bại:** chỉ 1 người chơi online đứng yên ở lối vào; thuê phụ bếp `banh_mi` + thu ngân; chạy 1 ngày (7200 × 0.05 s) → `served ≥ 30`, `revenue > 0`, `money ≥ 0` mọi bước, nhân viên luôn nằm trong `bounds` và ngoài mọi footprint; mở `chao_op_la, ban_bm_trung, ke_bm_trung` (đặt `unlocked = true`), thuê phụ bếp `banh_mi_trung` → sau 60 s `ke_bm_trung.stock > 0` hoặc đã có khách mua `banh_mi_trung`; nhân viên không bao giờ cầm quá 3 món.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** `npx vitest run` PASS. **Step 5:** Commit `feat(sim): nhân viên tự làm việc`.

---

### Task 8: Snapshot v2, báo cáo, giao thức

**Files:** Create `shared/src/sim/report.ts`; Modify `shared/src/sim/snapshot.ts`, `shared/src/net/protocol.ts`; Test `shared/test/snapshot.test.ts`, `shared/test/report.test.ts`

**Interfaces:**
- Produces:
```ts
// MSG thêm: hire:'hire', fire:'fire', setPrice:'setPrice', rename:'rename', getReport:'getReport', report:'report', actionError:'actionError'
interface HireMsg { role: StaffRole; item: ItemId | null }   interface FireMsg { staffId: string }
interface SetPriceMsg { item: ItemId; price: number }        interface RenameMsg { name: string }
interface Report { history: DaySummary[]; today: DaySummary }   // today = số liệu ngày đang chạy (chưa trừ lương: wages = số người × WAGE dự kiến)
buildReport(world): Report
// Snapshot.players[i] thêm: cap: number; pick: number (0..1 = pickTimer/PICK_INTERVAL); pickAt: string | null
// Snapshot thêm: staff: { id; name; role; item; x; z; dir; carry: ItemId[] }[]; prices: Partial<Record<ItemId, number>>
```
- [ ] **Step 1: Test thất bại:** snapshot có `staff` sau khi thuê, `players[0].cap === 4`, `pick` đúng 0.5 khi `pickTimer = 0.225`; `buildReport` sau 2 ngày → `history.length 2`, `today.day === 3`, `today.wages` = 300K × số nhân viên.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): snapshot v2, báo cáo`.

---

### Task 9: Server — message quản lý

**Files:** Modify `server/src/rooms/WorldRoom.ts`; Test `server/test/room.test.ts`

**Interfaces:**
- Consumes: `hireStaff`, `fireStaff`, `setPrice`, `renamePlayer`, `buildReport`, `MSG`.
- Hành vi: mỗi message chỉ xử lý nếu client là chủ nhân vật (`ownedPlayer`); kết quả `ok:false` → `client.send(MSG.actionError, { error })`; `getReport` → `client.send(MSG.report, buildReport(world))`; `rename` cập nhật tên.
- [ ] **Step 1: Test thất bại:** client gửi `hire {role:'cashier'}` → snapshot có 1 staff role cashier; gửi lại → nhận `actionError {error:'NO_SLOT'}`; `setPrice {item:'banh_mi', price:6000}` → `snapshot.prices.banh_mi === 6000`; `getReport` → nhận `report` có `today.day === 1`; `rename {name:'Ông Bố'}` → snapshot tên mới.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(server): message quản lý`.

---

### Task 10: Client — số món đang cầm, vòng nhặt, nhân viên, thùng rác

**Files:** Modify `client/src/render/{characters.ts,stations.ts,scene.ts}`, `client/src/game/gameLoop.ts`, `client/src/ui/hud.ts`, `client/src/main.ts`; Test `client/test/hud.test.ts`

**Interfaces:**
- Produces: `carryBadge(count: number, cap: number): { text: string; full: boolean }` → `"3/4"`, `full` khi `count >= cap`; `hudText` thêm `basket: '🧺 3/4'` (của chính mình).
- Hình: nhãn "3/4" trên đầu mọi người chơi và nhân viên (đỏ khi đầy, ẩn khi tay trống); vòng tiến trình nhỏ trên trạm `pickAt` của chính mình theo `pick`; nhân viên = nhân vật đội mũ trắng + tạp dề trắng, nhãn `"Lan · thu ngân"` / `"Hùng · Bánh mì"`; thùng rác = khối trụ xám có nắp; sàn/tường theo `bounds` mới; chữ nổi xám `-6K` khi event `trash`.
- [ ] **Step 1: Test thất bại:** `carryBadge(3,4)` = `{text:'3/4', full:false}`, `carryBadge(4,4).full === true`; `hudText(s).basket === '🧺 3/4'` với người chơi của mình cầm 3/4.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS; kiểm tra tay trên Chrome: nhặt chậm thấy vòng chạy, nhãn số, bỏ rác, thuê nhân viên (tạm qua console `__qnm`) thấy họ đi bê.
- [ ] **Step 5:** Commit `feat(client): số món đang cầm, nhân viên, thùng rác`.

---

### Task 11: Âm thanh

**Files:** Create `client/src/audio/{engine.ts,cues.ts,music.ts}`, `client/src/settings.ts`; Modify `client/src/main.ts`, `client/src/lobby.ts`; Test `client/test/cues.test.ts`, `client/test/settings.test.ts`

**Interfaces:**
- Produces:
```ts
type Cue = 'pick' | 'drop' | 'trash' | 'cash' | 'unlock' | 'lost' | 'dayEnd';
cuesFor(prevCarry: number, nextCarry: number, events: SimEvent[], myId: string): Cue[]
// tăng → 'pick'; giảm và không có event trash của mình → 'drop'; event trash của mình → 'trash' (1 lần/event);
// sale → 'cash'; unlock → 'unlock'; customerLost → 'lost'; dayEnd → 'dayEnd'
createAudio(): { unlock(): void; play(c: Cue): void; setVolumes(v: { music: number; sfx: number; muted: boolean }): void; startMusic(): void }
interface Settings { music: number; sfx: number; muted: boolean; showHint: boolean }
loadSettings(): Settings       // mặc định {music:0.3, sfx:0.7, muted:false, showHint:true}; localStorage lỗi → mặc định
saveSettings(s: Settings): void
```
Âm thanh tổng hợp bằng OscillatorNode/GainNode (mỗi cue ≤ 0,6 s); nhạc nền: vòng ngũ cung 8 nhịp sóng tam giác, gain theo `music`. `AudioContext` tạo/resume ở lần bấm nút đầu tiên trong sảnh (trình duyệt chặn âm thanh tự phát).
- [ ] **Step 1: Test thất bại:** `cuesFor(1,2,[],'me')` = `['pick']`; `cuesFor(2,1,[],'me')` = `['drop']`; `cuesFor(2,1,[{type:'trash',playerId:'me',...}],'me')` = `['trash']`; sale+unlock → chứa `'cash','unlock'`; `loadSettings()` khi `localStorage` ném lỗi → mặc định.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS; nghe thử tay trên Chrome.
- [ ] **Step 5:** Commit `feat(client): âm thanh`.

---

### Task 12: Menu + tab Báo cáo

**Files:** Create `client/src/ui/menu/{menu.ts,reportTab.ts,format.ts}`; Modify `client/src/net.ts`, `client/src/main.ts`, `client/src/style.css`; Test `client/test/report.test.ts`

**Interfaces:**
- Produces:
```ts
reportRows(r: Report): { day: string; cells: string[] }[]   // hôm nay trước ("Hôm nay (ngày 3)"), rồi các ngày mới → cũ
// cột: Doanh thu, Nguyên liệu, Lương, Bỏ đi, Lãi hoạt động, Mở rộng, Khách, Bỏ về, Sao
chartBars(r: Report, n = 14): { day: number; revenue: number; profit: number; hRevenue: number; hProfit: number }[]  // h* ∈ [0,1] theo max |giá trị|
soldList(s: DaySummary): { name: string; count: number }[]   // sắp giảm dần
// GameConnection thêm: requestReport(): void; onReport(cb); onActionError(cb); hire(...); fire(...); setPrice(...); rename(...)
openMenu(tab?) / closeMenu(); phím M bật/tắt, Esc đóng, nút ☰ góc phải trên.
```
Menu mở → gửi `getReport` ngay và mỗi 2 s khi tab Báo cáo đang mở. Biểu đồ: SVG cột đôi (doanh thu xanh, lãi cam; lãi âm vẽ xuống dưới trục).
- [ ] **Step 1: Test thất bại:** `reportRows` với 2 ngày lịch sử + hôm nay → 3 dòng, dòng đầu `"Hôm nay (ngày 3)"`, cột tiền dùng `formatK`; `chartBars` 20 ngày → 14 phần tử cuối, `hRevenue` max = 1; `soldList` sắp đúng.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS; kiểm tra tay: phím M mở menu, thấy bảng + biểu đồ.
- [ ] **Step 5:** Commit `feat(client): menu và báo cáo`.

---

### Task 13: Tab Nhân sự, Giá bán, Cài đặt

**Files:** Create `client/src/ui/menu/{staffTab.ts,pricesTab.ts,settingsTab.ts}`; Modify `client/src/input.ts`, `client/src/ui/menu/menu.ts`; Test `client/test/menuTabs.test.ts`, `client/test/input.test.ts`

**Interfaces:**
- Produces:
```ts
staffView(s: Snapshot): { cashier: { name: string | null; canHire: boolean }; lines: { item: ItemId; itemName: string; staffName: string | null; staffId: string | null }[]; wagePerDay: string }
priceView(s: Snapshot): { item: ItemId; name: string; current: string; market: string; min: number; max: number; value: number }[]
actionErrorText(e: string): string   // NO_SLOT → 'Đã đủ người cho việc này', LINE_TAKEN → 'Món này đã có người phụ trách', BAD_ITEM → 'Món này chưa bán', NOT_FOUND → 'Không tìm thấy nhân viên'
createKeyboardInput(): { read(); dispose(); setEnabled(on: boolean): void }   // tắt → read() = {0,0} và xoá phím đang giữ
```
- Nhân sự: dòng thu ngân + một dòng cho mỗi món có kệ mở; nút "Thuê" / "Cho nghỉ"; hiện "Lương 300K/ngày/người · trả cuối ngày".
- Giá bán: mỗi món: tên, giá thị trường, giá hiện tại, nút `−` `+` (±500đ), thanh trượt, nút "Về giá thị trường"; gợi ý "Khách thường chấp nhận 80–130% giá thị trường".
- Cài đặt: thanh âm lượng nhạc / hiệu ứng, tắt tiếng, đổi tên (gửi `rename`), bật/tắt dòng hướng dẫn phím.
- Mở menu → `setEnabled(false)` + gửi input 0 ngay; đóng → `setEnabled(true)`.
- [ ] **Step 1: Test thất bại:** `staffView` với 1 thu ngân + kệ bánh mì → `cashier.canHire === false`, `lines` có `banh_mi`; `priceView` → `min 2500 / max 10000`, `current '6K'` khi giá 6000; `actionErrorText('LINE_TAKEN')`; **(Review Focus 5)** `setEnabled(false)` khi đang giữ phím → `read()` = `{mx:0,mz:0}` và sau `setEnabled(true)` vẫn 0 cho tới khi bấm lại (dùng `KeyboardEvent` giả trên `window` — test chạy trong môi trường `jsdom`: thêm `// @vitest-environment jsdom` và cài `jsdom` dev).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS; kiểm tra tay: thuê thu ngân + phụ bếp, đổi giá, đổi tên, chỉnh âm lượng.
- [ ] **Step 5:** Commit `feat(client): nhân sự, giá bán, cài đặt`.

---

### Task 14: Kiểm tra tổng + README + deploy

**Files:** Modify `README.md`

- [ ] **Step 1:** `npx vitest run` toàn bộ PASS; `npm run typecheck` 0 lỗi; build sạch như Render (`git clone` vào scratchpad, `NODE_ENV=production npm ci --include=dev && npm run build && npm start` với Postgres Docker, `/health` OK).
- [ ] **Step 2:** Kiểm tra tay 2 cửa sổ trên Chrome: thuê thu ngân + phụ bếp → quán tự bán; đổi giá ở cửa sổ A thấy ở cửa sổ B; hết ngày thấy báo cáo có lương; file lưu Kế hoạch 1 (tạo bằng code `main` cũ) mở được.
- [ ] **Step 3:** README: thêm phần "Menu" (phím M), thùng rác, nhân viên, giá bán, âm thanh.
- [ ] **Step 4:** Commit `docs: hướng dẫn Kế hoạch 2`.
