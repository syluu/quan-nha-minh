# Thiết kế bổ sung: Kế hoạch 7 — Trang phục

Ngày: 2026-11-17 · Trạng thái: **ĐÃ DUYỆT** (spec gốc §10, §11 đã duyệt; chủ dự án yêu cầu làm tiếp KH 5–7 không cần hỏi lại)

## Quyết định [Đã chốt — từ spec gốc]
- Trang phục **mất tiền, trả từ ví chung**; mỗi người chơi có **trang phục riêng**.
- Danh mục: **áo, quần, mũ** (nón lá, mũ bảo hiểm, mũ lưỡi trai…), **tạp dề**, nhiều màu; giá **200K–5.000K**.
- Làm bằng cách **ghép / đổi màu các khối** của nhân vật low-poly.
- **Phá sản vẫn giữ trang phục đã mua** (cùng tên nhân vật và mã quán).
- Menu có mục **Trang phục**.

## Quyết định của người viết [Đề xuất, chỉnh được]
- 4 ô: **mũ, áo, quần, tạp dề**. Món mặc định miễn phí: nón lá, áo màu riêng của nhân vật, quần nâu, không tạp dề.
- Danh mục v1 (giá):
  - Mũ: mũ lưỡi trai đỏ 300K, mũ lưỡi trai xanh 300K, mũ bảo hiểm vàng 800K, mũ đầu bếp 1.500K, mũ phớt 3.000K.
  - Áo: trắng 200K, đỏ 200K, vàng 200K, xanh lá 200K, hồng 300K, đen 300K, **áo dài đỏ 5.000K**, **áo dài xanh 5.000K** (thân áo dài, vạt xoè).
  - Quần: đen 200K, xanh jean 300K, trắng 300K.
  - Tạp dề: trắng 400K, đỏ 500K, kẻ caro 1.000K.
- Mua một món → **thuộc về người mua** và **mặc ngay**. Món đã có đổi mặc lại miễn phí. Không mua được khi đang kết toán hoặc thiếu tiền.
- Menu → **👕 Trang phục**: theo từng ô, mỗi món có ô màu, giá, nút "Mua & mặc" / "Mặc" / "Đang mặc". Người khác trong nhà thấy ngay trang phục mới.
- Nhân vật hiện trang phục ở mọi nơi (quán, trang trại); chỉ áp dụng cho người chơi (nhân viên và khách giữ kiểu riêng).
- Chi tiêu trang phục ghi vào nhật ký; không tính vào lãi hoạt động (giống mở máy).
- File lưu v7.
