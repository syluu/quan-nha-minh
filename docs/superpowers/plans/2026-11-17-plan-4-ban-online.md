# Kế hoạch 4 — Bán online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đăng ký bán online (điểm giao hàng), đơn online sinh theo giờ/sao/quảng cáo, shipper xe máy/ô tô tới cửa chờ, người chơi/nhân viên giao đơn bê món ra, hoa hồng 20%, huỷ đơn trừ sao, tạm ngưng nhận đơn, báo cáo đơn online.

**Architecture:** Như các kế hoạch trước: luật trong `shared/src/sim/online.ts` (thuần, có test); `tick` gọi `tickOnline`; trạm mới kind `pickup`; server nối message; client vẽ shipper + điểm giao + bong bóng đơn và thêm mục trong menu. File lưu v4.

**Tech Stack:** như Kế hoạch 3.

**Spec:** `docs/superpowers/specs/2026-11-17-ke-hoach-4-ban-online-design.md` (+ spec gốc §8.1)

## Global Constraints
- Như Kế hoạch 1–3 (tiền nguyên đồng, tiếng Việt, sim thuần, tiền không âm, số liệu trong content).
- `ONLINE`: `commission 0.2`, `baseIntervalSec 20`, `maxPending 6`, `lastOrderHour 21.5`, xe máy `{patience 60, batch 1, speed 4}`, ô tô `{patience 90, batchMin 2, batchMax 5, waitOldest 30, speed 5}`, `carUpgradeCost K(5000)`, điểm giao `unlockCost K(2000)`.
- Đơn online dùng `trafficMultiplier(effectiveStars)²` × `marketingMultiplier` × `hourMultiplier`.
- Sao đơn: ≤ 20 s → 5, ≤ 40 s → 4, còn lại 3; đơn huỷ → 1.

## Review Focus
1. **Shipper bỏ đi đúng lúc người chơi đang đặt món cuối** → không vừa trả tiền vừa huỷ; tiền không âm; mỗi đơn chỉ hoàn thành hoặc huỷ một lần. (Test Task 4.)
2. **Tạm ngưng nhận đơn khi đang có shipper chờ** → shipper hiện tại vẫn được giao xong; không sinh đơn mới. (Test Task 3.)
3. **Bán điểm giao (kết toán) khi có đơn đang chờ** → huỷ sạch đơn + shipper, không kẹt. (Test Task 6.)
4. **File lưu v3 / v2 / v1** mở được, có trạm điểm giao (chưa mở). (Test Task 2.)
5. **Hết món trên kệ và máy** → nhân viên giao đơn không kẹt, không cầm quá sức. (Test Task 5.)

### Task 1: Trạm điểm giao + số liệu
**Files:** `shared/src/content/{stations.ts,balance.ts,shops/banhMi.ts}`; Test `shared/test/content.test.ts`
- `StationDef` thêm `{ kind:'pickup'; id:'diem_giao'; name:'Điểm giao hàng'; footprint:{w:1.0,d:0.8} }`; `PlacedStation.shipperPoint?: {x,z}`; `ShopLayout.shipperSpawn: {x,z}`.
- Đặt `diem_giao` ở `(-7.2, 2.6)`, `workPoint (-6.3, 2.6)`, `shipperPoint (-7.2, 3.6)`, `unlockCost K(2000)`, `requires ['ke_banh_mi']`; `shipperSpawn (-9.5, 4.6)` (ngoài sàn, vỉa hè).
- Test: content cũ vẫn qua (vùng không chồng, workPoint, ô trả tiền); đoạn `shipperSpawn → shipperPoint` không cắt footprint.
- Commit `feat(content): điểm giao hàng`.

### Task 2: File lưu v4
**Files:** `shared/src/sim/{world.ts,migrate.ts,snapshot.ts}`; Test `shared/test/migrate.test.ts`
```ts
interface Order { id: number; items: ItemId[]; delivered: ItemId[]; total: number; createdSec: number }
interface Shipper { vehicle: 'bike'|'car'; x; z; dir; state: 'arriving'|'waiting'|'leaving'; orderIds: number[]; waited: number }
// ShopState += orders: Order[]; nextOrderId; nextOrderIn; shipper: Shipper | null; onlinePaused: boolean
// DayStats += commission, onlineOrders, onlineCancelled
// WorldState.schemaVersion: 4; migrateV3toV4; normalizeLoaded nhận 1..4; khi tải: shipper = null, orders = [] (đơn dở dang bỏ)
```
- Test: v3 → v4 mặc định; v1 → v4; `normalizeLoaded` dọn đơn/shipper.
- Commit `feat(sim): file lưu v4`.

### Task 3: Sinh đơn online
**Files:** Create `shared/src/sim/online.ts`; Test `shared/test/online.test.ts`
```ts
isOnlineOpen(world, shopId): boolean          // điểm giao đã mở && !onlinePaused
spawnOrder(world, shopId): Order | null       // 1–3 món đang bán, lọc theo giá (WTP); null nếu không còn món nào
tickOrders(world, shopId, dt): void           // nextOrderIn--, ≤0 → sinh (nếu mở, giờ < 21.5, orders chờ < 6), khoảng cách mũ
```
- Test: chưa đăng ký → 0 đơn; đăng ký, sao 3, 360 s → 8–30 đơn; tạm ngưng → 0 đơn mới (**Review Focus 2**: đơn/shipper đang có vẫn còn); tối đa 6 chờ; giá gấp đôi → không sinh đơn món đó.
- Commit `feat(sim): đơn online`.

### Task 4: Shipper + giao đơn
**Files:** `shared/src/sim/online.ts`, `shared/src/sim/carry.ts`, `shared/src/sim/tick.ts`, `shared/src/sim/events.ts`; Test `shared/test/online.test.ts`
```ts
tickShipper(world, shopId, dt): SimEvent[]   // không có shipper và có đơn → gọi xe (bike: 1 đơn cũ nhất; car: khi ≥2 đơn hoặc đơn cũ nhất chờ ≥30 s, lấy ≤5)
                                             // arriving → tới shipperPoint → waiting (waited += dt) → hết patience: huỷ đơn chưa đủ → leaving → xoá
pickupNeeds(shop): ItemId[]                  // món còn thiếu của các đơn shipper đang chờ
deliverToPickup(world, shopId, item): boolean // ghi vào đơn đầu tiên cần món đó; đơn đủ → trả tiền net, commission, sold, rating; event orderDone
// carry.ts: trạm 'pickup' nhận món nếu shipper đang 'waiting' và pickupNeeds có món đó (DROP_INTERVAL)
// SimEvent += {type:'orderDone'; shopId; net; x; z} | {type:'orderCancelled'; shopId; x; z}
```
- Test: xe máy tới, người chơi đứng ở điểm giao cầm đúng món → đơn xong, tiền += total×0.8, `commission`, `onlineOrders`, sao 5, shipper đi; không ai giao → sau 60 s huỷ, sao 1, món đã đưa → `wasted`; ô tô gom 2–5 đơn; **(Review Focus 1)** đặt món cuối cùng ở đúng tick hết patience → đơn hoàn thành (không huỷ), tiền cộng một lần.
- Commit `feat(sim): shipper và giao đơn`.

### Task 5: Nhân viên giao đơn
**Files:** `shared/src/sim/staff.ts`; Test `shared/test/staffAi.test.ts`, `shared/test/staff.test.ts`
- `StaffRole` thêm `'courier'`; `hireStaff(..., 'courier')` khi điểm giao đã mở, tối đa 1 (`NO_SLOT`, `BAD_ITEM` nếu chưa đăng ký); `staffSlots` thêm `courier`.
- AI: khi `pickupNeeds` có món → lấy từ đầu ra máy làm món đó, không có thì từ kệ món đó → mang tới điểm giao. Không có gì → đứng ở workPoint điểm giao.
- Test: chỉ có lò bánh mì + 1 đơn 2 bánh mì → nhân viên giao xong trong 40 s; **(Review Focus 5)** không có món → không kẹt, không cầm quá cấp.
- Commit `feat(sim): nhân viên giao đơn`.

### Task 6: Thao tác + snapshot v4 + báo cáo
**Files:** `shared/src/sim/{online.ts,settlement.ts,upgrades.ts,snapshot.ts,report.ts,time.ts}`, `shared/src/net/protocol.ts`; Test `shared/test/online.test.ts`, `shared/test/snapshot.test.ts`
```ts
setOnlinePaused(world, shopId, paused: unknown, byPlayerId): ActionResult
upgradePickup(world, shopId, byPlayerId): ActionResult  // xe máy → ô tô, 5.000K; PAUSED khi kết toán; MAXED; BAD_ITEM nếu chưa đăng ký
// sellStation('diem_giao'): huỷ mọi đơn + shipper (Review Focus 3); stationValue = 2.000K; upgradeSpent += 5.000K khi lên ô tô
// operatingProfit = revenue − ingredientCost − wages − commission
// Snapshot += online: { registered; paused; vehicle; pending: number; shipper: {vehicle,x,z,dir,state,needs: ItemId[], waited, patience} | null; ordersToday; cancelledToday }
// MSG += setOnlinePaused {paused}, upgradePickup {}
```
- Commit `feat(sim): thao tác bán online, snapshot v4`.

### Task 7: Server
- `act` cho `setOnlinePaused`, `upgradePickup`; event `orderDone`/`orderCancelled` broadcast. Test room: đăng ký (đặt `unlocked` qua store), `setOnlinePaused` → snapshot `paused`.
- Commit `feat(server): bán online`.

### Task 8: Client — điểm giao, shipper, bong bóng đơn, âm thanh
- Điểm giao: bàn + biển "🛵 Giao hàng". Shipper xe máy / ô tô low-poly đi tới, bong bóng "Cần: 2 Bánh mì, 1 Trà đá" + vòng thời gian chờ. Chữ nổi `+16K (online)` / `Huỷ đơn -1★`. Cue `orderDone` (cash), `orderCancelled` (lost).
- Test: `needsText(['banh_mi','banh_mi','tra_da'])` = `'Cần: 2 Bánh mì, 1 Trà đá'`; cuesFor event mới.
- Commit `feat(client): shipper và điểm giao`.

### Task 9: Client — menu
- Tab Quảng cáo thêm mục **Bán online**: trạng thái (chưa đăng ký → "Mở ô Điểm giao hàng 2.000K ở góc trước-trái quán"), tạm ngưng/nhận lại, đơn hôm nay/huỷ, hoa hồng 20%.
- Nhân sự: dòng "Giao đơn" khi đã đăng ký. Nâng cấp: "Điểm đón ô tô" 5.000K.
- Báo cáo + tổng kết ngày: cột/dòng "Hoa hồng app", "Đơn online", "Đơn huỷ".
- Test view models. Commit `feat(client): menu bán online`.

### Task 10: Kiểm tra tổng + README + merge/push
- `npm run check`; build sạch kiểu Render; thử tay: mở điểm giao, có xe máy tới, bê bánh ra giao; README; commit; review cuối; merge `main`; push.
