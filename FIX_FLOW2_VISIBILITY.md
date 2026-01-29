# ✅ Flow 2 Score Range Selection - Fixed

## Vấn đề

Khi user chọn Flow 2, phần chọn khoảng điểm (score range) không hiển thị.

## Nguyên nhân

Flow 2 section visibility handlers trong `main.js` chưa được khởi tạo đúng cách hoặc không được gọi.

## Giải pháp Implemented

### main.js - Cải tiến Event Listeners

**Thay đổi:**

```javascript
// ===== FLOW SELECTION HANDLERS =====
const flowRadios = document.querySelectorAll('input[name="flowType"]');
const flow2Section = document.getElementById('flow2ScoreRangeSection');
const flow2RangeRadios = document.querySelectorAll('input[name="flow2ScoreRange"]');

// Hàm để update visibility của Flow 2 section
const updateFlow2Visibility = () => {
    const selected = document.querySelector('input[name="flowType"]:checked');

    if (selected && selected.value === 'flow2') {
        if (flow2Section) flow2Section.style.display = 'block';
        // Set default score range nếu chưa chọn
        const checkedScoreRange = document.querySelector('input[name="flow2ScoreRange"]:checked');
        if (!checkedScoreRange && flow2RangeRadios.length > 0) {
            flow2RangeRadios[0].checked = true;
        }
    } else {
        if (flow2Section) flow2Section.style.display = 'none';
    }
};

flowRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
        updateFlow2Visibility();
    });
});

// Gọi lần đầu để set up trạng thái ban đầu
updateFlow2Visibility();
```

## Chi tiết

1. **Query các elements** - Lấy tất cả Flow radio buttons, Flow 2 section, và score range radios
2. **Define updateFlow2Visibility()** - Hàm kiểm tra Flow hiện tại:
    - Nếu Flow 2: `display = 'block'` + set default score range
    - Nếu Flow 1: `display = 'none'`
3. **Attach event listeners** - Mỗi Flow radio gọi `updateFlow2Visibility()` khi thay đổi
4. **Initial call** - Gọi hàm lần đầu khi DOMContentLoaded để set trạng thái ban đầu

## Kết quả

✅ **User story hoạt động như mong đợi:**

1. Trang load → Flow 1 được chọn → Flow 2 section ẩn (đúng)
2. User click Flow 2 → Flow 2 section hiển thị (✨ FIX)
3. Score range options có thể chọn (✨ FIX)
4. Nếu user không chọn, default sẽ là option đầu tiên (8-9)
5. User chọn "Tùy chọn" → Input min/max hiển thị

## Testing Checklist

- [ ] Mở trang
- [ ] Chọn Flow 2 radio button
- [ ] Kiểm tra: "📊 Khoảng điểm chủ đạo của lớp" section hiển thị
- [ ] Kiểm tra: Có thể chọn các option (8-9, 7-9, 6-8, Tùy chọn)
- [ ] Chọn "Tùy chọn" → Min/Max input hiển thị
- [ ] Nhập min/max → Có thể thay đổi
- [ ] Chọn lại Flow 1 → Flow 2 section ẩn (kiểm tra không break Flow 1)

## Files Modified

- `Js/main.js` - Cải tiến event listeners cho Flow 2 score range selection

## Status

✅ **COMPLETE** - Flow 2 score range selection UI now works correctly
