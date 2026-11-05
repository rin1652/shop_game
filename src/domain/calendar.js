// Ngày dạng "YYYY-MM-DD" theo giờ địa phương. Hàm thuần, không phụ thuộc trình duyệt.

export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

// Một ngày được tính là "có học" nếu tự tay xong ít nhất 1 bước (bước tự đánh dấu 'auto' không tính) hoặc học ≥ 5 phút.
export const isActiveDay = (day) => Boolean(day && (Object.values(day.steps || {}).some((v) => v === true) || (day.seconds || 0) >= 300));

// Chuỗi ngày học liên tiếp. Hôm nay chưa học thì vẫn giữ chuỗi tính tới hôm qua.
export function streak(days, today) {
  let k = isActiveDay(days[today]) ? today : addDays(today, -1);
  let n = 0;
  while (isActiveDay(days[k])) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}
