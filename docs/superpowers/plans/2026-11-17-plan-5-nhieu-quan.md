# Kế hoạch 5 — Nhiều quán Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thuê mặt bằng mới + chọn loại hình (cơm tấm / phở & cà phê), đi giữa các quán, bàn ghế + dọn bàn, tiền thuê vào kết toán.

**Architecture:** `ShopId = 'banh_mi' | 'com_tam' | 'pho_cafe'`; `world.shops` luôn có đủ 3 quán, cờ `owned` cho biết đã thuê. `PlayerState.location: ShopId`. Mọi hệ thống theo quán (di chuyển, bê đồ, ô trả tiền, thu ngân) chỉ xét người chơi đang ở quán đó; `tick` chỉ chạy quán `owned`. Server gửi mỗi client snapshot của quán client đang đứng. Client dựng lại cảnh khi đổi quán. File lưu v5.

**Tech Stack:** như trước. **Spec:** `docs/superpowers/specs/2026-11-17-ke-hoach-5-nhieu-quan-design.md`

## Global Constraints
- Như Kế hoạch 1–4. Không gắn cứng `'banh_mi'` trong logic mới (dùng `shopId` / `player.location`).
- `SHOP_META[shopId] = { name, sign, deposit, rentPerMonth, hasTables }`: bánh mì (0, 0, không bàn); cơm tấm (8.000K, 4.000K, có); phở & cà phê (12.000K, 6.000K, có).
- Bàn: 2 chỗ, ô trả tiền 500K; ăn tại chỗ 60%, ăn 20 s, dọn 0,5 s/chỗ; mang về khi hết chỗ → sao tối đa 4.

## Review Focus
1. Hai người ở hai quán khác nhau cùng đứng trên ô trả tiền / quầy thu ngân cùng toạ độ → chỉ tính cho quán của mỗi người.
2. Thuê mặt bằng khi đang kết toán / thiếu tiền / chưa mở hết → từ chối rõ ràng, tiền không đổi.
3. File lưu v4 → v5: mọi người ở quán bánh mì, 2 quán mới chưa thuê.
4. Trả mặt bằng khi có người chơi đang đứng ở đó → người đó về quán bánh mì, không kẹt ở quán không còn.
5. Bàn bẩn hết chỗ + nhiều khách → khách mang về, không kẹt, không âm chỗ.

### Task 1: Nội dung 2 quán mới
- `ids.ts`: `ShopId` + nguyên liệu `gao, xuong_bo, thit_bo, ca_phe, sua_dac` + món `com, suon_nuong, cha_trung, com_tam_suon, com_tam_suon_cha, nuoc_dung, banh_pho, bo_tai, pho_bo, ca_phe_phin, ca_phe_sua_da`.
- `stations.ts`: kind `'table'` (`seats: 2`) + máy/kệ mới; `shops/comTam.ts`, `shops/phoCafe.ts` cùng khung bố cục bánh mì (6 máy, 6 kệ/thu ngân, thùng rác trái, điểm giao phải) + 4 bàn phía trước-trái; `SHOP_META`, `hourCurve` riêng (cơm tấm trưa ×2, tối ×1,5; phở sáng ×2, chiều cà phê ×1,3).
- Test content `describe.each` chạy cho cả 3 quán (vùng không chồng, đường khách, workPoint, đường nhân viên) + bàn không cắt đường khách; `itemCost('com_tam_suon') === 10_000`, `itemCost('pho_bo') === 27_000`.
- Commit `feat(content): quán cơm tấm, quán phở & cà phê`.

### Task 2: File lưu v5 + thế giới nhiều quán
- `ShopState.owned`; `StationState.dirty` (chỗ bẩn), `seated`; `Customer` thêm `state 'toTable'|'eating'`, `table`, `eatTimer`, `takeaway`; `PlayerState.location`; `world.extraWagesOwed`.
- `createWorld` tạo đủ 3 quán (`owned` chỉ bánh mì). `migrateV4toV5`: thêm 2 quán chưa thuê, mọi người ở `banh_mi`.
- Test migrate (**Focus 3**) + `createWorld`.
- Commit `feat(sim): file lưu v5`.

### Task 3: Hệ thống theo địa điểm
- `tick`: chỉ quán `owned`; di chuyển dùng layout của `player.location`; `tickCarry`, `tickPayTiles`, `isCashierManned`, trash chỉ xét người chơi ở quán đó. `joinPlayer` đặt ở lối vào quán `location`. Tổng kết ngày `stars` = trung bình quán đang có.
- Test **Focus 1**: 2 người cùng toạ độ ở 2 quán, chỉ người ở quán có ô mới trả tiền; thu ngân chỉ tính người ở quán đó.
- Commit `feat(sim): địa điểm`.

### Task 4: Thuê mặt bằng, đi lại, trả mặt bằng, tiền thuê
- `isShopComplete(world, shopId)`, `canRent(world)`, `rentShop(world, shopId, by)` (BAD_ITEM / NOT_READY? → dùng `BAD_ROLE` nếu loại sai, `NO_SLOT` nếu đã thuê, `MAXED` nếu chưa mở hết quán hiện có, `NO_MONEY`, `PAUSED`), `travel(world, playerId, to)` (chỉ quán `owned`), settlement `rent = Σ rentPerMonth` quán đang thuê, `sellableStations` thêm mục `{ instanceId: 'mat_bang', shopId, refund }` cho quán thuê (không phải bánh mì) → `returnShop` (Focus 4).
- `assetValue` cộng cọc quán đang thuê.
- Commit `feat(sim): thuê mặt bằng, đi lại`.

### Task 5: Bàn ghế, ăn tại chỗ, dọn bàn
- Khách sau khi trả tiền: 60% muốn ngồi → bàn có chỗ sạch → `toTable` → `eating` 20 s → về, `dirty += 1`; không có → mang về, sao ≤ 4 (Focus 5).
- Người chơi đứng yên cạnh bàn bẩn: dọn 1 chỗ / 0,5 s. Vai `cleaner` (1 / quán có bàn) tự đi dọn.
- Commit `feat(sim): bàn ghế, dọn bàn`.

### Task 6: Snapshot theo quán + server
- `toSnapshot(world, shopId)` thêm `shopId`, `owned` các quán (cho bản đồ: `shops: {id, name, owned, complete}[]`, `canRent`), bàn (`stations[].dirty/seated`), khách đang ăn. Server: snapshot gửi riêng từng client theo `location`; MSG `rentShop {shopId}`, `travel {to}`; mọi `act` dùng `player.location` làm `shopId`.
- Test room: thuê + đi → snapshot `shopId` đổi.
- Commit `feat(server): nhiều quán`.

### Task 7: Client
- Cảnh dựng theo `snapshot.shopId` (dựng lại khi đổi), biển tên theo quán, mô hình món mới, bàn (đĩa bẩn), khách ngồi ăn; tab **Bản đồ** (đi tới / thuê + chọn loại hình); Nhân sự thêm "Dọn bàn"; HUD hiện tên quán; giá/nâng cấp/marketing theo quán đang đứng.
- Test view models. Commit `feat(client): nhiều quán`.

### Task 8: Kiểm tra + README + review + merge + push
