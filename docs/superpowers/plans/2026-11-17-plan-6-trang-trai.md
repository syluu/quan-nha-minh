# Kế hoạch 6 — Trang trại Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Trang trại tuỳ chọn: thuê, mở lô (ruộng/chuồng như máy), bê thùng lên xe → kho tổng, máy ở quán lấy kho trước rồi mới mua chợ, phí chở hàng, người làm trang trại, tiền thuê vào kết toán.

**Architecture:** Trang trại là địa điểm thứ 4 dùng lại `ShopState` (`ShopId` thêm `'farm'`, `SHOP_META.farm.kind = 'farm'`). Hai loại trạm mới: `plot` (giống producer nhưng tốn `seedCost` và ra **thùng hàng**) và `truck` (nhận thùng → `world.warehouse`). Món mới là các **thùng hàng** (`ItemDef.bundle: {ingredient, qty}[]`, không bán được). Quán chỉ là các địa điểm có `kind: 'shop'`: khách, giá, quảng cáo, online, sao chỉ chạy với quán. File lưu v6.

**Spec:** `docs/superpowers/specs/2026-11-17-ke-hoach-6-trang-trai-design.md`

## Global Constraints
- Như Kế hoạch 1–5. Không gắn cứng `'farm'` ngoài content/meta; kiểm tra bằng `SHOP_META[id].kind`.
- Mọi số liệu trong `balance.ts` / content.

## Review Focus
1. Máy ở quán: kho đủ → không trừ tiền; kho thiếu một phần → chỉ trả phần thiếu theo giá chợ; kho không bao giờ âm.
2. Thuê trang trại khi đang kết toán / thiếu tiền → từ chối, tiền không đổi; thuê trang trại không làm mất quyền thuê quán (và ngược lại).
3. Các hệ thống chỉ dành cho quán (khách, đơn online, thu ngân, giá) không chạy / không lỗi ở trang trại.
4. File lưu v5 → v6: thêm trang trại chưa thuê, kho rỗng.
5. Trả trang trại khi có người đứng ở đó / nhân viên đang cầm thùng → về xe bánh mì, kho giữ nguyên.

### Task 1: Nội dung trang trại
- `ids.ts`: `ShopId` + `'farm'`; món thùng `thung_rau, bao_bot_mi, bao_gao, khay_trung, thung_thit_lon, thung_thit_bo` (`sellable: false`, `bundle`).
- `stations.ts`: kind `plot` (`seedCost`, `output`, `cycleSec`, `outputCap`), kind `truck`; `shops/farm.ts` (bố cục 16×11: 6 lô hàng sau, xe chở hàng giữa phía trước, thùng rác trái).
- `SHOP_META.farm = { kind: 'farm', deposit 5.000K, rentPerMonth 1.500K, plotRent 300K }`, các quán `kind: 'shop'`.
- Test content: bố cục farm qua các test chung (bỏ các test chỉ dành cho quán khi không có thu ngân); tỉ lệ giá thùng/giá chợ 30–70%.

### Task 2: Kho tổng + file lưu v6
- `world.warehouse`; `createWorld` thêm farm chưa thuê; `migrateV5toV6`.
- `production.ts`: plot chạy như producer với `seedCost`; producer/assembler lấy kho trước (Focus 1).
- `carry.ts`: nhặt ở plot như producer; đặt thùng lên `truck` → kho.
- Commit `feat(sim): kho tổng, lô trang trại`.

### Task 3: Thuê trang trại, tiền thuê, phí chở, người làm trang trại
- `rentShop` cho farm (điều kiện riêng, Focus 2); `canRent` chỉ xét quán; settlement `rent` cộng `plotRent × số lô đã mở`; `returnShop` farm (Focus 5); phí chở mỗi sáng.
- Tick: khách/đơn online/sao chỉ cho quán (Focus 3).
- Vai `farmhand` (tối đa 2): lô có thùng → bê ra xe.
- Commit `feat(sim): trang trại`.

### Task 4: Snapshot + server
- Snapshot: `warehouse`, `shops[].kind`; server không đổi (thao tác dùng `location`).
- Commit `feat(server): trang trại`.

### Task 5: Client
- Cảnh trang trại (nền cỏ, biển "TRANG TRẠI NHÀ MÌNH"), lô (đất + cây lớn dần theo tiến độ / chuồng có rào + con vật khối), xe tải, thùng hàng; Bản đồ: trang trại + kho tổng; Nhân sự: người làm trang trại; các tab chỉ dành cho quán ghi "Không áp dụng".
- Commit `feat(client): trang trại`.

### Task 6: Kiểm tra + README + review + merge + push
