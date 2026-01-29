# ✅ Unified Prompt System - Test Guide

## Overview

Both Flow 1 and Flow 2 now use unified prompt builders that share the same base system prompt and core AI instructions. Only the output format differs based on flow type.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Lesson Description (Shared Input)              │
│                                                             │
│  "Hôm nay dạy Toán về phân số. Học sinh làm bài tập..."   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─────────────────────────┬─────────────────────────┐
                  │                         │                         │
                  ▼                         ▼                         ▼
          ┌─────────────────┐        ┌──────────────────┐
          │    Flow 1        │        │    Flow 2         │
          └─────────────────┘        └──────────────────┘
                  │                         │
                  │                         │ + Score Range
                  │                         │ (8-9, 7-9, etc.)
                  ▼                         ▼
        ┌──────────────────────────────────────┐
        │   SHARED SYSTEM PROMPT               │
        │   (AI instructions, tone, rules)     │
        └──────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
    Flow 1 Prompt      Flow 2 Prompt
    (20 comments)      (15 HIGH/MID/LOW)
        │                    │
        ▼                    ▼
    Plain Text            JSON
    Line-by-line          Structured
        │                    │
        ▼                    ▼
    Textarea             Textarea
    (Editable)           (Editable)
```

---

## Unified Prompt System Components

### 1. SYSTEM_PROMPT (Shared by Both Flows)

**Location**: `Js/promptFlow2.js` line 10

**Purpose**: Core AI instructions defining:

- Behavior (create short, positive, specific comments)
- Tone (academic, supportive, no negative critique)
- Format (1-2 sentences per comment, concrete examples)
- Constraints (no comparisons, no scores mentioned)

**Used by**:

- `buildPromptFlow1()` - inherited in Flow 1 prompt
- `buildPromptFlow2()` - inherited in Flow 2 prompt

---

### 2. buildPromptFlow1(lessonDescription)

**Location**: `Js/promptFlow2.js` line 33

**Input**:

- `lessonDescription`: Text describing the lesson (e.g., "Taught division today...")

**Output**: Prompt requesting 20 diverse comments in plain text format

**Process**:

1. Takes lesson description
2. Combines with SYSTEM_PROMPT
3. Requests 20 comments suitable for students of different levels
4. AI returns: plain text, one comment per line

**Format Example**:

```
Học sinh thể hiện sự chủ động khi giải bài tập chia.
Có thể cố gắng thêm khi làm bài tập tính nhẩm.
Nắm vững kiến thức về chia hết.
...
```

---

### 3. buildPromptFlow2(lessonDescription, scoreRange)

**Location**: `Js/promptFlow2.js` line 51

**Input**:

- `lessonDescription`: Text describing the lesson
- `scoreRange`: Score range like "8-9", "7-9", "6-8", or custom "x-y"

**Output**: Prompt requesting 15 comments organized by score level (HIGH/MID/LOW)

**Process**:

1. Takes lesson description + score range
2. Calculates score boundaries (HIGH, MID, LOW)
3. Combines with SYSTEM_PROMPT
4. Requests 5 comments for each level (5 HIGH + 5 MID + 5 LOW)
5. AI returns: JSON with comments organized by level

**Format Example**:

```json
{
  "scoreRange": "8-9",
  "lessonSummary": "Luyện tập chia và tính nhẩm",
  "commentBank": {
    "HIGH": {
      "range": "8.5-9",
      "comments": [
        "Giải bài tập chia rất chính xác",
        "Tính nhẩm nhanh và đúng...",
        ...
      ]
    },
    "MID": { ... },
    "LOW": { ... }
  }
}
```

---

## Main.js Integration

### Flow 1 Path

```javascript
// Line 149-220 in main.js
if (flowType === 'flow1') {
    const prompt = buildPromptFlow1(lesson);

    const onCommentReceived = (comment) => {
        // Append each comment to textarea
        commentsInput.value += comment + '\n';
    };

    await generateCommentsFromGemini(prompt, onCommentReceived);
}
```

**Output**: 20 comments in textarea (plain text), editable by user

---

### Flow 2 Path

```javascript
// Line 225-280 in main.js
} else {
    const prompt = buildPromptFlow2(lesson, finalScoreRange);

    const onCommentBankReceived = (result) => {
        const jsonStr = extractJSON(result);
        commentBank = JSON.parse(jsonStr);
    };

    await generateCommentsFromGemini(prompt, onCommentBankReceived, true);

    window.flow2CommentBank = commentBank.commentBank;
    window.flow2ScoreRange = finalScoreRange;
    // Format and display in textarea
}
```

**Output**: 15 comments formatted in textarea (HIGH/MID/LOW sections), editable by user

---

## Testing Scenarios

### Test 1: Flow 1 Basic Operation

**Steps**:

1. Select "Flow 1" radio button
2. Enter lesson description: "Hôm nay dạy Toán về phân số, học sinh làm 10 bài tập."
3. Click "✨ Sinh nhận xét"
4. Wait for AI to generate

**Expected Result**:

- ✅ Progress shows "📥 Đã nhận X nhận xét..." updating count
- ✅ 20 comments appear in textarea, one per line
- ✅ Comments are diverse (some positive, some encouraging, some for struggling students)
- ✅ Textarea is editable - can modify/delete comments
- ✅ Toast shows "✨ Đã sinh 20 nhận xét!"

**Validation**:

- [ ] Comment count is 20
- [ ] All comments are related to "phân số" lesson
- [ ] Text quality is good (not generic)
- [ ] No JSON formatting in output

---

### Test 2: Flow 2 Basic Operation

**Steps**:

1. Select "Flow 2" radio button
2. Enter lesson description: "Hôm nay dạy Tiếng Anh về quá khứ, học sinh nói chuyện."
3. Select score range "8-9"
4. Click "✨ Sinh nhận xét"
5. Wait for AI to generate

**Expected Result**:

- ✅ Progress shows "⏳ Đang gọi AI để sinh kho nhận xét..."
- ✅ Textarea shows formatted comments with headers:

    ```
    === HIGH (8.5-9) ===
    Comment 1
    Comment 2
    ...

    === MID (8-8.4) ===
    Comment 1
    ...

    === LOW (<8) ===
    Comment 1
    ...
    ```

- ✅ Textarea is editable
- ✅ Total 15 comments (5 per level)

**Validation**:

- [ ] Formatted with HIGH/MID/LOW sections
- [ ] 5 comments in each section
- [ ] Comments match score levels (HIGH should be more positive)
- [ ] Score range is correct (8-9 → HIGH 8.5-9, etc.)

---

### Test 3: Flow 2 Custom Score Range

**Steps**:

1. Select "Flow 2" radio button
2. Enter lesson description
3. Select "Tùy chọn (Custom)"
4. Enter Min: 6, Max: 8
5. Click "✨ Sinh nhận xét"

**Expected Result**:

- ✅ Custom score range calculated correctly
- ✅ HIGH range ~7.2-8 (upper 20%)
- ✅ MID range ~6.8-7.1 (middle)
- ✅ LOW range <6.8
- ✅ Comments appropriate for 6-8 score range (less stellar, more encouraging)

---

### Test 4: Flow Switching

**Steps**:

1. Generate Flow 1 comments (20 comments in textarea)
2. Click Flow 2 radio button
3. Select score range
4. Click "✨ Sinh nhận xét"

**Expected Result**:

- ✅ Textarea clears when switching to Flow 2
- ✅ New Flow 2 comments appear (15 comments with HIGH/MID/LOW)

5. Switch back to Flow 1
6. Enter new lesson

**Expected Result**:

- ✅ Textarea clears
- ✅ New Flow 1 comments generated (20 comments)
- ✅ No data leakage between flows

---

### Test 5: Prompt Consistency

**Steps**:

1. Generate comments in Flow 1 for: "Luyện tập Toán"
2. Note AI tone and comment style
3. Generate comments in Flow 2 (8-9) for: "Luyện tập Toán"
4. Compare

**Expected Result**:

- ✅ Both flows use same tone/style (because same SYSTEM_PROMPT)
- ✅ Only difference: Flow 2 is organized by HIGH/MID/LOW
- ✅ No inconsistency in language or approach

---

### Test 6: Comment Editing

**Steps**:

1. Generate Flow 2 comments
2. Click in textarea
3. Modify/add/delete comments
4. Click "🔨 Tạo Script"

**Expected Result**:

- ✅ Script uses edited comments (not original AI output)
- ✅ Modified structure preserved in script

---

## Verification Checklist

- [ ] **promptFlow2.js has both builders**
    - `buildPromptFlow1(lessonDescription)` exists
    - `buildPromptFlow2(lessonDescription, scoreRange)` exists
    - Both import `SYSTEM_PROMPT`

- [ ] **main.js imports correctly**
    - Line 12: `import { buildPromptFlow1, buildPromptFlow2 } from './promptFlow2.js'`

- [ ] **Flow 1 uses unified prompt**
    - Line ~175: `const prompt = buildPromptFlow1(lesson)`

- [ ] **Flow 2 uses unified prompt**
    - Line ~248: `const prompt = buildPromptFlow2(lesson, finalScoreRange)`

- [ ] **No syntax errors**
    - Both files compile without errors
    - No missing imports/exports

- [ ] **AI calls work**
    - Flow 1 generates line-by-line comments
    - Flow 2 generates JSON COMMENT_BANK

---

## Troubleshooting

### Issue: Flow 1 comments not appearing

**Cause**: `buildPromptFlow1` not imported or called
**Fix**: Check import on line 12 of main.js

### Issue: Flow 2 shows JSON instead of formatted text

**Cause**: `formatCommentBankForDisplay` not called or `extractJSON` failing
**Fix**: Check JSON extraction logic and formatting in main.js ~260-290

### Issue: Comments same between flows

**Cause**: Using wrong prompt builder
**Fix**: Verify Flow 1 uses `buildPromptFlow1()` and Flow 2 uses `buildPromptFlow2()`

### Issue: Score range not affecting comments

**Cause**: `scoreRange` not passed to `buildPromptFlow2`
**Fix**: Check line ~248 passes `finalScoreRange` to function

---

## Success Criteria

✅ **System Complete When**:

1. Flow 1 generates 20 diverse comments using `buildPromptFlow1()`
2. Flow 2 generates 15 comments organized HIGH/MID/LOW using `buildPromptFlow2()`
3. Both flows share the same `SYSTEM_PROMPT`
4. Both flows produce comments with consistent tone/style
5. No syntax errors in promptFlow2.js or main.js
6. Comments are editable in textarea before script generation
7. Script generation uses edited/stored comments correctly

---

## Documentation Files Created

1. `UNIFIED_PROMPT_SYSTEM.md` - Detailed architecture documentation
2. `IMPLEMENTATION_SUMMARY.md` - What changed and why
3. `TEST_GUIDE.md` - This file - Testing procedures and verification

All three files are in workspace root for reference.
