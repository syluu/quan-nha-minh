# Kế hoạch 7 — Trang phục Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mỗi người chơi mua (ví chung) và mặc trang phục riêng: mũ, áo, quần, tạp dề; giữ khi phá sản.

**Architecture:** Danh mục trong `shared/src/content/costumes.ts` (`CostumeDef {id, slot, name, price, color, style}`). `PlayerState.outfit: Record<Slot, string>` + `wardrobe: string[]`. Thao tác `buyCostume` / `wearCostume`. Snapshot gửi `outfit` từng người. Client `CharacterView.setOutfit()` đổi màu/khối. File lưu v7.

**Spec:** `docs/superpowers/specs/2026-11-17-ke-hoach-7-trang-phuc-design.md`

## Review Focus
1. Mua khi thiếu tiền / đang kết toán / món lạ / ô sai → từ chối, tiền không đổi.
2. Phá sản giữ `outfit` + `wardrobe`.
3. File lưu v6 → v7: mặc định đúng, người chơi cũ không mất gì.
4. Mặc món chưa có → từ chối; mặc món của người khác không được (mỗi người một tủ đồ).
5. Client: đổi trang phục không rò bộ nhớ / không làm đứng vòng vẽ.

### Task 1: Danh mục + sim + file lưu v7
- `costumes.ts` (giá 200K–5.000K, mặc định giá 0); `buyCostume(world, playerId, id)`, `wearCostume(world, playerId, id)`; `migrateV6toV7`; bankrupt giữ đồ.
- Test Focus 1–4. Commit `feat(sim): trang phục`.

### Task 2: Snapshot + server
- Snapshot `players[].outfit`, `players[].wardrobe`; MSG `buyCostume {id}`, `wearCostume {id}`. Test room. Commit `feat(server): trang phục`.

### Task 3: Client
- `characters.ts`: `setOutfit` (mũ: nón lá/lưỡi trai/bảo hiểm/đầu bếp/phớt; áo màu + áo dài; quần màu; tạp dề màu/caro). Tab **👕 Trang phục**. Test view model. Commit `feat(client): trang phục`.

### Task 4: README + review + merge + push
