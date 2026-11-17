# Kế hoạch 3 — Nâng cấp, Quảng cáo, Ngân hàng, Kết toán cuối tháng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lương cộng dồn theo ngày và kết toán cuối tháng (có vay / bán máy / phá sản), nâng cấp từng nhân viên, nhân vật, máy, chạy quảng cáo — tất cả qua menu, đồng bộ cho cả nhà.

**Architecture:** Như Kế hoạch 1–2: luật chơi mới là hàm thuần trong `shared/src/sim` (trả `ActionResult`), server chỉ nối message → hàm; client thêm tab menu + bảng kết toán chặn màn hình. Kết toán cuối tháng là `world.settlement`; khi khác null thì `tick` dừng hẳn (cả nhà chờ). File lưu nâng `schemaVersion` 2 → 3.

**Tech Stack:** như Kế hoạch 2.

**Spec:** `docs/superpowers/specs/2026-11-17-ke-hoach-3-nang-cap-ngan-hang-design.md` (+ spec gốc §8, §10, §11)

## Global Constraints
- Mọi Global Constraints của Kế hoạch 1–2 vẫn áp dụng (tiền nguyên đồng + `formatK`, tiếng Việt, sim thuần, số liệu trong `shared/src/content`, tiền không bao giờ âm).
- `MONTH_DAYS = 7`. Kết toán xảy ra khi kết thúc ngày có `day % 7 === 0`.
- Nhân viên cấp 1–4: tốc độ 2.24 / 2.56 / 2.88 / 3.2, mang 3/4/5/6, lương 120K/150K/180K/210K, phí đào tạo lên cấp 2/3/4: 500K / 800K / 1.300K.
- Nhân vật: mang 4/6/8/10/12 (giá 300K/500K/800K/1.300K); tốc độ 3.2 × (1 + 0.1·cấp), 5 cấp (200K/320K/500K/800K/1.300K).
- Máy (producer/assembler) 3 cấp: `cycleSec × 0.85^cấp`, `outputCap × (1 + 0.5·cấp)` làm tròn xuống; giá cấp n = làm tròn 500đ của `0.5 × giá trị máy × 1.6^(n−1)`.
- Giá trị máy: `unlockCost`, riêng bộ khởi đầu: lò bánh mì 3.000K, kệ bánh mì 500K, quầy thu ngân 500K, thùng rác 0.
- Quảng cáo: `to_roi` 200K +20% 1 ngày; `mxh` 1.000K +50% 3 ngày; `review` 5.000K +100% +0,3 sao 2 ngày; cộng dồn giảm dần ×1, ×0,5, ×0,25…
- Vay: tối đa `max(2.000K, 50% giá trị tài sản) − nợ còn lại`; kỳ 1/2/4 tháng, lãi 5%/9%/15%; góp đều cuối tháng (làm tròn lên 1.000đ); số tiền vay bội số 100K, tối thiểu 500K.
- Bán máy: 50% × (giá trị máy + tiền đã nâng cấp máy); chỉ máy không phải bộ khởi đầu và không có máy đang mở nào `requires` nó.

## Review Focus
1. **Kết toán thiếu tiền khi có 2 người cùng bấm vay / bán** → không trả hai lần, không vay quá hạn mức, tiền không âm. (Test Task 4: gọi `takeLoan` rồi `sellStation` liên tiếp trong khi settlement mở.)
2. **Server khởi động lại đúng lúc đang kết toán** → tải lại vẫn thấy bảng kết toán, game vẫn dừng, không mất khoản phải trả. (Test Task 1 `normalizeLoaded` giữ `settlement`; Task 9 lưu khi phòng đóng.)
3. **Sa thải khi không đủ tiền trả lương còn nợ** → từ chối `NO_MONEY`, nhân viên ở lại, tiền không đổi. (Test Task 2.)
4. **Message linh tinh** (số tiền vay NaN/âm/chuỗi, kỳ hạn 3, campaign lạ, nâng cấp quá cấp tối đa) → lỗi rõ ràng, không đổi state. (Test Task 3, 5, 6.)
5. **Phá sản khi có người đang offline** → mọi nhân vật vẫn còn (giữ tên, id, màu), vị trí về lối vào, mất nâng cấp; mã quán giữ nguyên. (Test Task 4.)

---

### Task 1: Số liệu + file lưu v3

**Files:** Modify `shared/src/content/balance.ts`, `shared/src/sim/{world.ts,migrate.ts,snapshot.ts}`; Test `shared/test/migrate.test.ts`, `shared/test/content.test.ts`

**Interfaces — Produces:**
```ts
// BALANCE thêm: MONTH_DAYS: 7; STAFF_LEVELS: {speed,carry,wage,train}[4]; PLAYER_CARRY_CAPS: [4,6,8,10,12];
// PLAYER_CARRY_COSTS: [K(300),K(500),K(800),K(1300)]; PLAYER_SPEED_COSTS: [K(200),K(320),K(500),K(800),K(1300)];
// MACHINE_MAX_LEVEL: 3; MACHINE_CYCLE_FACTOR: 0.85; MACHINE_CAP_BONUS: 0.5; STARTER_VALUES: Record<string, number>;
// CAMPAIGNS: Record<CampaignId, {name; cost; boost; days; starBonus}>; LOAN_TERMS: {1:0.05, 2:0.09, 4:0.15};
// LOAN_MIN_CAP: K(2000); LOAN_ASSET_RATIO: 0.5; LOAN_STEP: K(100); LOAN_MIN: K(500); SELL_RATIO: 0.5
// WAGE và STAFF_SPEED/STAFF_CARRY → thay bằng STAFF_LEVELS[0]
type CampaignId = 'to_roi' | 'mxh' | 'review';
interface Loan { id: string; principal: number; totalDue: number; paid: number; installment: number; monthsLeft: number; takenDay: number }
interface Settlement { month: number; revenue: number; ingredientCost: number; marketing: number; wages: number; rent: number; loanDue: number; totalDue: number }
// StaffState += level: 1|2|3|4; wageOwed: number
// PlayerState += carryLevel: number; speedLevel: number
// StationState += level: number; upgradeSpent: number
// ShopState += campaigns: { id: CampaignId; daysLeft: number }[]
// DayStats += marketing: number
// WorldState: schemaVersion: 3; += loans: Loan[]; nextLoanId: number; settlement: Settlement | null; month: number (bắt đầu 1)
migrateV2toV3(raw): any; normalizeLoaded nhận 1 | 2 | 3 (1 → v2 → v3), GIỮ NGUYÊN settlement
```
- [ ] **Step 1: Test thất bại:** file v2 (tạo bằng `createWorld` rồi ép về dạng v2 trong test) → v3 có `staff[i].level === 1`, `wageOwed === 0`, `players.carryLevel === 0`, `stations.level === 0`, `campaigns === []`, `loans === []`, `settlement === null`, `month === 1`, `dayStats.marketing === 0`; file v1 vẫn lên v3; **(Review Focus 2)** v3 có `settlement` khác null → `normalizeLoaded` giữ nguyên; content test: `STAFF_LEVELS` 4 cấp đúng bảng; `STARTER_VALUES` có đủ mọi trạm `unlockCost 0`.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt (sửa mọi chỗ dùng `WAGE`, `STAFF_SPEED`, `STAFF_CARRY` sang `STAFF_LEVELS[s.level-1]`). **Step 4:** `npx vitest run` PASS. **Step 5:** Commit `feat(sim): file lưu v3`.

---

### Task 2: Lương cộng dồn, sa thải trả ngay, mở kết toán cuối tháng

**Files:** Modify `shared/src/sim/{staff.ts,time.ts,tick.ts}`; Create `shared/src/sim/settlement.ts`; Test `shared/test/wages.test.ts` (viết lại), `shared/test/settlement.test.ts`

**Interfaces — Produces:**
```ts
staffWage(s: StaffState): number                       // STAFF_LEVELS[s.level-1].wage
accrueWages(world): number                             // cuối ngày: wageOwed += staffWage, dayStats.wages += tổng; trả tổng
fireStaff(...)                                         // SỬA: money < wageOwed → { ok:false, error:'NO_MONEY' }; đủ → trả, log "… đã cho Lan nghỉ, trả 360K lương"
buildSettlement(world): Settlement                     // cộng 7 ngày cuối trong history + lương còn nợ + góp nợ đến hạn
trySettle(world): SimEvent[]                           // đủ tiền → trả hết, settlement = null, month++, event 'monthClosed'
// advanceTime: hết ngày → accrueWages → summary/history → nếu day % MONTH_DAYS === 0: settlement = buildSettlement, trySettle
// tick: world.settlement !== null → return [] (dừng hẳn, cả nhà chờ)
// SimEvent += { type:'monthEnd'; settlement: Settlement } | { type:'monthClosed'; month: number }
```
Bỏ hẳn `payWages` cũ và luật "không trả được thì nghỉ việc". `ActionResult.error` thêm `'NO_MONEY' | 'MAXED' | 'BAD_AMOUNT' | 'NOT_SELLABLE' | 'NO_SETTLEMENT'`.
- [ ] **Step 1: Test thất bại:** 2 nhân viên cấp 1 → sau 1 ngày `wageOwed 120K` mỗi người, tiền KHÔNG đổi vì lương, `summary.wages === 240K`; cuối ngày 7 → `settlement` có `wages === 1.680K` (2 × 7 × 120K); đủ tiền → tự trả, `settlement === null`, `month === 2`, `wageOwed` về 0, event `monthClosed`; thiếu tiền → `settlement` còn, `tick` không đổi `secOfDay`; **(Review Focus 3)** sa thải khi `money < wageOwed` → `NO_MONEY`, không đổi gì; đủ tiền → trả đúng số ngày đã làm.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS (sửa test cũ về lương theo luật mới). **Step 5:** Commit `feat(sim): lương cộng dồn, kết toán cuối tháng`.

---

### Task 3: Ngân hàng

**Files:** Create `shared/src/sim/bank.ts`; Test `shared/test/bank.test.ts`

**Interfaces — Produces:**
```ts
assetValue(world): number            // Σ giá trị máy đang mở (STARTER_VALUES / unlockCost) + upgradeSpent
debtRemaining(world): number         // Σ (totalDue − paid)
maxLoan(world): number               // max(LOAN_MIN_CAP, LOAN_ASSET_RATIO × assetValue) − debtRemaining, làm tròn xuống LOAN_STEP, ≥ 0
takeLoan(world, amount: unknown, months: unknown, byPlayerId): ActionResult   // BAD_AMOUNT nếu không phải số, < LOAN_MIN, không chia hết LOAN_STEP, > maxLoan, hoặc months ∉ {1,2,4}
repayLoan(world, loanId: unknown, byPlayerId): ActionResult                  // trả hết phần còn lại; NOT_FOUND / NO_MONEY
loanInstallmentsDue(world): number   // Σ min(installment, totalDue − paid) — dùng trong buildSettlement
// trySettle trả góp: mỗi khoản paid += min(installment, còn lại), monthsLeft--, hết nợ thì xoá; log
```
Vay xong gọi `trySettle` (nếu đang kết toán). Log: `"Bố vay 2.000K, kỳ 2 tháng (tổng trả 2.180K)"`.
- [ ] **Step 1: Test thất bại:** quán mới: `assetValue === 4.000K`, `maxLoan === 2.000K`; vay 1.000K kỳ 2 tháng → `money +1.000K`, `totalDue 1.090K`, `installment 545K`; `maxLoan` còn 1.000K; **(Review Focus 4)** vay `NaN`, `-5`, `'1000000'`, `250_000` (không chia hết 100K), `150_000` (< tối thiểu), quá hạn mức, `months: 3` → đều `BAD_AMOUNT`, state không đổi; cuối tháng 1 góp 545K, cuối tháng 2 góp nốt rồi khoản vay biến mất; trả sớm `repayLoan` → hết nợ.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): ngân hàng`.

---

### Task 4: Bán máy, phá sản

**Files:** Modify `shared/src/sim/settlement.ts`; Test `shared/test/settlement.test.ts`

**Interfaces — Produces:**
```ts
sellableStations(world, shopId): { instanceId: string; refund: number }[]   // mở, không phải bộ khởi đầu, không bị trạm đang mở nào requires
sellStation(world, shopId, instanceId: unknown, byPlayerId): ActionResult    // NOT_SELLABLE; refund vào ví; trạm về khoá (paid 0, level 0, upgradeSpent 0, xoá hàng); log; trySettle
bankrupt(world): void   // giữ code, rngState, players (id/name/color; vị trí lối vào, carry rỗng, cấp 0); mọi thứ khác = createWorld; log "Quán phá sản — bắt đầu lại từ xe bánh mì"
// trySettle: sau khi thử trả, nếu vẫn thiếu VÀ maxLoan === 0 VÀ sellableStations rỗng → bankrupt + event 'bankrupt'
```
- [ ] **Step 1: Test thất bại:** chảo + bàn trứng đang mở → chỉ bàn trứng bán được, chảo không (bị requires); bán bàn trứng (đã nâng 1 cấp) → hoàn 50% × (1.500K + tiền nâng); **(Review Focus 1)** settlement thiếu 500K: `takeLoan` 500K rồi `sellStation` ngay sau → lần vay đủ thì settlement đóng, `sellStation` sau đó vẫn hợp lệ (bán bình thường) nhưng không trả kết toán lần 2, tiền ≥ 0; **(Review Focus 5)** nợ không thể trả + hết hạn mức + không còn máy bán → `bankrupt`: 2 người (1 offline) vẫn còn đủ tên/màu, `money 5.000K`, `day 1`, `staff []`, `loans []`, `code` giữ nguyên, event `bankrupt`.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): bán máy, phá sản`.

---

### Task 5: Nâng cấp nhân vật, nhân viên, máy

**Files:** Create `shared/src/sim/upgrades.ts`; Modify `shared/src/sim/{production.ts,staff.ts,players.ts}`; Test `shared/test/upgrades.test.ts`

**Interfaces — Produces:**
```ts
upgradePlayer(world, playerId, kind: unknown): ActionResult           // 'carry' | 'speed'; MAXED / NO_MONEY / BAD_ROLE (kind lạ); cập nhật carryCap/speed
upgradeStaff(world, shopId, staffId: unknown, byPlayerId): ActionResult  // level+1, trừ phí đào tạo; MAXED / NO_MONEY / NOT_FOUND; log "Mẹ đã nâng Lan lên cấp 2 (lương 150K/ngày)"
upgradeMachine(world, shopId, instanceId: unknown, byPlayerId): ActionResult // chỉ producer/assembler đã mở; upgradeSpent += giá
machineUpgradeCost(shopId, instanceId, toLevel: number): number
effectiveCycle(def, st): number; effectiveOutputCap(def, st): number   // dùng trong production.ts
// staff dùng STAFF_LEVELS[level-1].speed / .carry thay hằng số cũ
```
- [ ] **Step 1: Test thất bại:** nâng mang của người chơi 4 lần → `carryCap 12`, tiền giảm 2.900K, lần 5 → `MAXED`; tốc độ cấp 2 → `speed ≈ 3.84`; nâng nhân viên lên cấp 2 → tiền −500K, lương ngày sau là 150K, mang 4, tốc độ 2.56; thiếu tiền → `NO_MONEY`; lò bánh mì cấp 1 → giá 1.500K, `effectiveCycle 2.55`, `effectiveOutputCap 12`; cấp 4 → `MAXED`; `kind: 'fly'` → lỗi, không đổi gì (**Review Focus 4**).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): nâng cấp`.

---

### Task 6: Quảng cáo

**Files:** Create `shared/src/sim/marketing.ts`; Modify `shared/src/sim/{customers.ts,time.ts,snapshot.ts}`; Test `shared/test/marketing.test.ts`

**Interfaces — Produces:**
```ts
runCampaign(world, shopId, id: unknown, byPlayerId): ActionResult   // BAD_ITEM nếu id lạ; NO_MONEY; trừ tiền, dayStats.marketing += cost; thêm {id, daysLeft: days}; log
marketingMultiplier(shop): number   // 1 + Σ boost (sắp giảm dần) × [1, 0.5, 0.25, …]
effectiveStars(shop): number        // min(5, stars(ratings) + max starBonus đang chạy)
// cuối ngày: daysLeft--, bỏ cái về 0. customers dùng trafficMultiplier(effectiveStars) × marketingMultiplier.
// Snapshot.stars = effectiveStars; Snapshot.campaigns = shop.campaigns
```
- [ ] **Step 1: Test thất bại:** chạy `mxh` → tiền −1.000K, multiplier 1.5; thêm `to_roi` → 1.5 + 0.2×0.5 = 1.6; `review` với sao 3.0 → `effectiveStars 3.3`; sau 3 ngày `mxh` hết; `'tiktok'` → `BAD_ITEM`; thiếu tiền → `NO_MONEY`; spawn cả ngày có `mxh` nhiều khách hơn không có (cùng seed).
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): quảng cáo`.

---

### Task 7: Sửa lỗi nhỏ của nhân viên

**Files:** Modify `shared/src/sim/staff.ts`; Test `shared/test/staffAi.test.ts`, `shared/test/staff.test.ts`
- Cho nghỉ người đang cầm đồ: từng món về trạm còn chỗ nhận món đó (`roomAt`), còn thừa → `dayStats.wasted += itemCost`.
- Phụ bếp cầm món thừa mà không có chỗ nhận: nếu món đó là input/đầu ra của chính dây chuyền mình thì vẫn được `chooseJob` (bê tiếp chuyến hợp lệ), không đứng im mãi.
- [ ] **Step 1: Test thất bại:** cho nghỉ phụ bếp cầm 2 bánh mì khi kệ còn 1 chỗ → kệ +1, `wasted +2.000`; phụ bếp món ghép cầm bánh mì thừa, bàn ghép đầy bánh mì nhưng thiếu trứng → trong 20 s vẫn bê trứng vào bàn.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `fix(sim): nhân viên nghỉ/món thừa`.

---

### Task 8: Snapshot v3 + giao thức

**Files:** Modify `shared/src/net/protocol.ts`, `shared/src/sim/{snapshot.ts,report.ts}`; Test `shared/test/snapshot.test.ts`

**Interfaces — Produces:**
```ts
// MSG += upgradePlayer {kind}, upgradeStaff {staffId}, upgradeMachine {instanceId}, runCampaign {campaign},
//        takeLoan {amount, months}, repayLoan {loanId}, sellStation {instanceId}
// Snapshot += month: number; daysToMonthEnd: number; campaigns; loans: {id; remaining; installment; monthsLeft}[];
//   maxLoan: number; settlement: Settlement | null; sellable: {instanceId; refund}[] (chỉ khi settlement ≠ null);
//   players[i] += carryLevel, speedLevel; staff[i] += level, wageOwed; stations[i] += level
// Report.today += marketing; Report.months: Settlement[] (lịch sử kết toán, tối đa 12)
```
- [ ] **Step 1: Test thất bại:** snapshot sau khi vay + chạy quảng cáo + nâng cấp chứa đủ trường; `daysToMonthEnd` ngày 1 = 7, ngày 7 = 1; `sellable` rỗng khi không kết toán.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(sim): snapshot v3`.

---

### Task 9: Server — message mới

**Files:** Modify `server/src/rooms/WorldRoom.ts`; Test `server/test/room.test.ts`
- Mỗi message mới gọi hàm tương ứng qua `act(...)` (chỉ chủ nhân vật). Event `monthEnd` / `monthClosed` / `bankrupt` → broadcast + lưu ngay.
- [ ] **Step 1: Test thất bại:** `takeLoan {amount:1_000_000, months:2}` → snapshot `loans` có 1 khoản, tiền +1.000K; `takeLoan {amount:'x'}` → `actionError BAD_AMOUNT`; `runCampaign {campaign:'to_roi'}` → `campaigns` có `to_roi`; `upgradePlayer {kind:'carry'}` → người đó `cap 6`.
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `feat(server): message nâng cấp, quảng cáo, ngân hàng`.

---

### Task 10: Client — tab Nâng cấp + Nhân sự có cấp

**Files:** Create `client/src/ui/menu/upgradesTab.ts`; Modify `client/src/ui/menu/{staffTab.ts,views.ts}`, `client/src/net.ts`, `client/src/main.ts`; Test `client/test/menuTabs.test.ts`
- `upgradeView(s, myId)`: bản thân (mang `6/12` + giá cấp sau hoặc "Tối đa", tốc độ `cấp 2/5`), danh sách máy đã mở (cấp, thời gian làm, sức chứa, giá cấp sau).
- `staffView` thêm mỗi người: `level`, `speedPct` (70/80/90/100), `carry`, `wage`, `owed`, `nextTrain` (giá hoặc null).
- "Cho nghỉ" hỏi xác nhận trong menu (không dùng `confirm()` của trình duyệt): "Cho Lan nghỉ? Trả ngay 360K lương còn nợ".
- [ ] **Step 1: Test thất bại** cho `upgradeView` và `staffView` mới (đúng chuỗi/giá). **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS + thử tay. **Step 5:** Commit `feat(client): nâng cấp`.

---

### Task 11: Client — tab Quảng cáo + Ngân hàng

**Files:** Create `client/src/ui/menu/{marketingTab.ts,bankTab.ts}`; Modify `views.ts`; Test `client/test/menuTabs.test.ts`
- Quảng cáo: 3 thẻ (tên, giá, tác dụng, thời gian, nút "Chạy"), danh sách đang chạy + còn mấy ngày, hệ số khách hiện tại.
- Ngân hàng: nợ còn lại từng khoản (góp/tháng, còn mấy tháng, nút "Trả hết"), hạn mức vay, form vay (số tiền bước 100K, kỳ 1/2/4 tháng, hiện tổng phải trả và góp mỗi tháng), "Còn N ngày tới kết toán".
- `loanPreview(amount, months)` → `{ total, installment }` (dùng chung công thức với `shared`).
- [ ] **Step 1: Test thất bại** `loanPreview(1_000_000, 2)` = `{total: 1_090_000, installment: 545_000}`, `marketingView`. **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS + thử tay. **Step 5:** Commit `feat(client): quảng cáo, ngân hàng`.

---

### Task 12: Client — bảng kết toán cuối tháng

**Files:** Create `client/src/ui/settlementModal.ts`; Modify `client/src/main.ts`, `client/src/style.css`; Test `client/test/settlement.test.ts`
- `settlementRows(st: Settlement)`: Doanh thu, Nguyên liệu, Quảng cáo, Lương nhân viên, Thuê mặt bằng, Góp nợ ngân hàng, **Tổng phải trả**.
- `snapshot.settlement ≠ null` → bảng giữa màn hình cho mọi người (không đóng được), tắt di chuyển; hiện tiền đang có, còn thiếu; nút "Vay ngân hàng" (form nhỏ, mặc định đúng số còn thiếu làm tròn lên 100K, kỳ 1 tháng), danh sách "Bán máy (+hoàn tiền)". Event `monthClosed` → bảng chuyển "Đã trả xong tháng N", nút Đóng. Event `bankrupt` → thông báo phá sản.
- [ ] **Step 1: Test thất bại** `settlementRows`, `shortfall(money, st)`, `suggestedLoan(shortfall)` (làm tròn lên 100K, tối thiểu 500K). **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS + thử tay (đặt tiền thấp bằng `__qnm` dev? — dùng bot: thuê 2 người, chạy tới ngày 7). **Step 5:** Commit `feat(client): kết toán cuối tháng`.

---

### Task 13: Client — âm thanh trên iPhone, chuông ngắn

**Files:** Modify `client/src/audio/{instance.ts,engine.ts,cues.ts}`; Test `client/test/cues.test.ts`
- Mở khoá thêm `click`, `touchend`; `unlock()` resume khi state ≠ `running`; cue `dayEnd` ≤ 0,6 s; cue mới `monthEnd` (chuông 2 nốt ≤ 0,6 s) cho event `monthEnd`.
- [ ] **Step 1: Test thất bại** `cuesFor` với event `monthEnd` → `['monthEnd']`. **Step 2:** FAIL. **Step 3:** Cài đặt. **Step 4:** PASS. **Step 5:** Commit `fix(client): âm thanh iPhone, chuông ngắn`.

---

### Task 14: Kiểm tra tổng + README + deploy
- [ ] **Step 1:** `npm run check` PASS; clean clone `NODE_ENV=production npm ci && npm run build && npm start` + `/health`.
- [ ] **Step 2:** Thử tay 2 cửa sổ: nâng cấp, quảng cáo, vay; chạy tới cuối tháng (7 ngày — dùng test tích hợp server nếu quá lâu) thấy bảng kết toán ở cả hai cửa sổ; file lưu v2 mở được.
- [ ] **Step 3:** README: Nâng cấp, Quảng cáo, Ngân hàng, kết toán cuối tháng, phá sản.
- [ ] **Step 4:** Commit `docs: hướng dẫn Kế hoạch 3`.
