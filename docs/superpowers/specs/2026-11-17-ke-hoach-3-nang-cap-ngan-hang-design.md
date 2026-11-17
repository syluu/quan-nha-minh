# Thiết kế bổ sung: Kế hoạch 3 — Nâng cấp, Quảng cáo, Ngân hàng, Kết toán cuối tháng

Ngày: 2026-11-17 · Trạng thái: **ĐÃ DUYỆT** (chủ dự án chốt trong cuộc trò chuyện) · Bổ sung cho `2026-11-17-quan-an-viet-design.md` §8, §10, §11 và `2026-11-17-ke-hoach-2-quan-ly-design.md`

## Lý do
Chơi thử Kế hoạch 2 cho thấy: thuê người ở đầu game lỗ nặng; chủ dự án muốn nhân viên rẻ lúc đầu và mạnh dần theo cấp (tăng lương theo cấp), muốn kết toán tiền **theo tháng** như kinh doanh thật (lương, mặt bằng, nợ), có thể vay ngân hàng đúng lúc thiếu tiền trả.

## Quyết định [Đã chốt]
1. **Lương tính theo ngày, trả cuối tháng.** Mỗi ngày làm việc cộng lương ngày vào "lương còn nợ" của từng nhân viên; cuối tháng trả một lần.
2. **Sa thải** → trả ngay lương còn nợ của người đó (theo số ngày đã làm). Không đủ tiền thì không cho nghỉ được (báo lỗi, gợi ý vay).
3. **Cuối tháng hiện bảng kết toán cho mọi người**: doanh thu, nguyên liệu, quảng cáo, lương phải trả, tiền thuê mặt bằng (hiện 0 — xe bánh mì chưa thuê mặt bằng; Kế hoạch 5 thêm), nợ ngân hàng đến hạn, tổng phải trả, tiền đang có.
   - Đủ tiền → tự trả hết, bảng là thông báo.
   - Thiếu tiền → **game tạm dừng cho cả nhà** tới khi đủ: vay ngân hàng ngay trong bảng, hoặc bán máy (thu 50% giá mua + 50% tiền nâng cấp). Ai đang online cũng thao tác được.
   - Không vay thêm được và không còn máy để bán → **phá sản**.
4. **Phá sản**: quán về như lúc mới mở (xe bánh mì với lò bánh mì, kệ bánh mì, quầy thu ngân, thùng rác, vốn ban đầu 5.000K, ngày 1). **Giữ** tên nhân vật và mã quán (sau này giữ cả trang phục — Kế hoạch 7). Mất: nhân viên, nợ, nâng cấp, máy đã mua, lịch sử.
5. **Nâng cấp mua trong menu.**
6. **Nâng cấp từng nhân viên** (mỗi người có tên riêng, nâng riêng, không nâng đồng loạt):

   | Cấp | Tốc độ (so với người chơi chưa nâng) | Mang tối đa | Lương/ngày | Phí đào tạo để lên cấp |
   |---|---|---|---|---|
   | 1 | 70% | 3 | 120K | — |
   | 2 | 80% | 4 | 150K | 500K |
   | 3 | 90% | 5 | 180K | 800K |
   | 4 | 100% | 6 | 210K | 1.300K |

   Cho nghỉ là mất cấp; thuê người mới bắt đầu cấp 1. Lương tăng **+30K/cấp** [Đã chốt].
7. **Nâng cấp nhân vật** (mỗi người chơi riêng, trả bằng ví chung): mang 4 → 6 → 8 → 10 → 12 món (300K / 500K / 800K / 1.300K); tốc độ +10%/cấp, 5 cấp (200K / 320K / 500K / 800K / 1.300K).
8. **Nâng cấp máy** (từng máy làm món, 3 cấp): mỗi cấp làm nhanh hơn 15% (thời gian ×0,85) và chứa đầu ra +50%. Giá cấp n = 50% giá trị máy × 1,6^(n−1), làm tròn 500đ.
9. **Quảng cáo** (spec gốc §8): tờ rơi 200K (+20% khách, 1 ngày), mạng xã hội 1.000K (+50%, 3 ngày), mời người review 5.000K (+100%, +0,3 sao, 2 ngày). Chạy chồng thì hiệu quả giảm dần (mạnh nhất tính đủ, cái thứ hai một nửa, thứ ba một phần tư). Trả tiền ngay khi chạy.
10. **Ngân hàng** (spec gốc §11): vay tối đa = max(2.000K, 50% giá trị tài sản) − nợ còn lại; kỳ hạn 1 / 2 / 4 tháng, tổng lãi 5% / 9% / 15%; trả góp đều **cuối mỗi tháng** (cùng lúc kết toán); trả sớm không phạt.

## Quyết định của người viết [Đề xuất, chỉnh được]
- **1 tháng trong game = 7 ngày** (≈ 42 phút chơi). Hằng số `MONTH_DAYS` trong file cân bằng.
- Giá trị tài sản = tổng giá trị các máy đang có (máy mua: giá mở khoá; máy ban đầu: lò 3.000K, kệ 500K, quầy 500K) + tiền đã nâng cấp máy.
- Chỉ bán được máy **không có máy khác đang dùng nó làm điều kiện** (ví dụ phải bán bàn bánh mì trứng trước khi bán chảo), và không bán bộ khởi đầu.
- "+0,3 sao" của người review: cộng thẳng vào số sao hiển thị và dùng để tính lượng khách trong thời gian chiến dịch (tối đa 5 sao).
- Thuê người không cần có tiền ngay (lương trả cuối tháng); kết toán cuối tháng là chốt chặn.
- Gộp các lỗi nhỏ còn tồn từ Kế hoạch 2: cho nghỉ người đang cầm đồ → trả đồ về kệ/máy còn chỗ, còn thừa tính "hàng bỏ đi"; phụ bếp không đứng chờ khi cầm món thừa; mở khoá âm thanh thêm `click`/`touchend` và trạng thái `interrupted`; tiếng chuông cuối ngày ≤ 0,6 s; "Cho nghỉ" hỏi xác nhận.

## Phương án đã cân nhắc
| Việc | Lựa chọn | Chọn | Lý do |
|---|---|---|---|
| Trả lương | Mỗi ngày · cuối tháng | Cuối tháng | Chủ dự án chọn; giống thật, có lúc cần vay |
| Độ dài tháng | 30 ngày (3 giờ chơi) · 7 ngày (42 phút) | 7 ngày | Gia đình chơi vài buổi mỗi tuần vẫn tới kỳ kết toán |
| Nâng cấp nhân viên | Đồng loạt · từng người | Từng người | Chủ dự án chọn |
| Nơi mua nâng cấp | Trong menu · đứng trên bàn nâng cấp | Trong menu | Chủ dự án chọn |
| Thiếu tiền cuối tháng | Tự động vay · dừng game cho người chơi chọn | Dừng game cho chọn | Spec gốc §11: bắt buộc chọn |
