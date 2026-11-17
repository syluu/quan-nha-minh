# Thiết kế bổ sung: Kế hoạch 2 — Tiện chơi + Quản lý quán

Ngày: 2026-11-17 · Trạng thái: **ĐÃ DUYỆT** (chủ dự án duyệt trong cuộc trò chuyện) · Bổ sung cho `2026-11-17-quan-an-viet-design.md`

## Lý do
Sau khi chơi thử Kế hoạch 1, chủ dự án cần: bỏ đồ thừa, tránh lấy nhầm vì máy sát nhau, biết mình đang cầm bao nhiêu, lấy đúng số món mong muốn, có âm thanh, và có menu (báo cáo từng ngày, thuê người, đổi giá, cài đặt).

## Quyết định [Đã chốt]
1. **Thùng rác** có sẵn trong bếp, miễn phí. Đứng yên cạnh thùng → bỏ từng món (0,2 s/món). Món bỏ đi = mất giá trị nguyên liệu, hiện "-2K" xám, cộng vào "Hàng bỏ đi" trong báo cáo.
2. **Giãn máy**: sàn ~16×11 m, máy và kệ cách nhau 2,5 m; vùng nhặt/đặt đồ (0,6 m) của các trạm không chồng nhau; có test giữ điều này. File lưu cũ vẫn chơi được.
3. **Số món đang cầm**: nhãn "3/4" trên đầu người chơi và nhân viên (đỏ khi đầy) + ô "🧺 3/4" trên HUD.
4. **Lấy dần**: nhặt từ máy **0,45 s/món**, đặt món 0,2 s/món; bước ra là dừng; có vòng tiến trình nhỏ báo món tiếp theo.
5. **Âm thanh** tự tạo bằng Web Audio (không file, không bản quyền): pop (nhặt), tách (đặt), ting ting (thu tiền), tada (mở máy), trầm (khách bỏ về), chuông (hết ngày), loạt xoẹt (bỏ rác) + nhạc nền nhẹ, tắt được.
6. **Menu** (nút ☰ hoặc phím M, Esc đóng):
   - **Báo cáo**: bảng từng ngày (doanh thu, nguyên liệu, lương, hàng bỏ đi, lãi hoạt động, chi mở rộng, khách phục vụ/bỏ về, sao) + "hôm nay đang chạy" + biểu đồ cột 14 ngày + số món bán được mỗi loại.
   - **Nhân sự**: thuê/sa thải. Thu ngân tối đa 1; phụ bếp mỗi người phụ trách 1 món (tự bê máy → kệ, món ghép thì bê cả nguyên liệu vào bàn ghép), tối đa = số kệ đang mở. Lương 300K/ngày trả cuối ngày. Nhân viên đi ~70% tốc độ người chơi, mang tối đa 3 món.
   - **Giá bán**: tăng/giảm giá từng món đang bán, hiện giá thị trường để so (khoảng cho phép 50–200%).
   - **Cài đặt**: âm lượng nhạc/hiệu ứng, tắt tiếng, đổi tên nhân vật.
7. Nâng cấp nhân vật/nhân viên/máy + marketing → Kế hoạch 3.

## Phương án đã cân nhắc
| Việc | Lựa chọn | Chọn | Lý do |
|---|---|---|---|
| Nhịp lấy món | Cố định 0,45 s · chậm rồi nhanh dần | Cố định 0,45 s | Chủ dự án chọn; dễ kiểm soát số món |
| Âm thanh | File CC0 tải về · tự tổng hợp Web Audio | Web Audio | Không tải file, không lo bản quyền, nhẹ |
| Báo cáo | Gửi kèm snapshot 10 lần/giây · hỏi khi mở menu | Hỏi khi mở menu | Lịch sử 30 ngày không cần gửi liên tục |

## Quyết định của người viết [Đề xuất, chủ dự án có thể sửa]
- Thuê giữa ngày vẫn tính lương cả ngày; sa thải giữa ngày vẫn trả lương ngày đó.
- Cuối ngày không đủ tiền trả lương → người chưa được trả **nghỉ việc** (ghi nhật ký). Kế hoạch 3 (ngân hàng) sẽ thay bằng cơ chế nợ đến hạn.
- Nhân viên chỉ đi trong lối bếp (giữa hàng máy và hàng kệ), không kích hoạt ô trả tiền, không dùng thùng rác.
- Âm lượng/tắt tiếng lưu theo từng máy (trình duyệt), không đồng bộ giữa người chơi.
