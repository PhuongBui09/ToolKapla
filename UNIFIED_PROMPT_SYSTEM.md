# Unified Prompt System (Flow 1 & Flow 2)

## Overview

**Goal**: Consolidate prompt logic for Flow 1 & Flow 2 into a single, unified system.

Both flows now share:

- **Same system prompt** (core AI instructions)
- **Same base logic** for generating comments based on lesson description
- **Differentiated output** based on flow type:
    - **Flow 1**: 20 comments (plain text, line-by-line)
    - **Flow 2**: 15 comments organized by score level (JSON with HIGH/MID/LOW)

---

## Architecture

### Prompt Layer: `promptFlow2.js`

Renamed conceptually to be the "unified prompt builder" for both flows.

#### 1. **SYSTEM_PROMPT** (Shared Foundation)

```javascript
export const SYSTEM_PROMPT = `
Bạn là AI hỗ trợ giáo viên tiểu học & THCS tại Việt Nam.

NHIỆM VỤ: Sinh nhận xét sư phạm NGẮN GỌN – TÍCH CỰC – ĐÚNG NGỮ CẢNH
Dựa trên mô tả buổi học do giáo viên cung cấp.
...
`
```

- **Used by**: Both Flow 1 and Flow 2
- **Purpose**: Defines AI behavior and constraints
- **Content**: Tone, style, safety guidelines, format instructions

#### 2. **buildPromptFlow1(lessonDescription)**

```javascript
export function buildPromptFlow1(lessonDescription) {
    return `${SYSTEM_PROMPT}

MÔ TẢ BUỔI HỌC:
${lessonDescription}

HÃY SINH RA 20 NHẬN XÉT:
- Nhận xét phù hợp cho học sinh có kết quả KHÁC NHAU
- Một số nhận xét cho học sinh giỏi
- Một số nhận xét cho học sinh trung bình
- Một số nhận xét cho học sinh cần cố gắng
...

ĐỊNH DẠNG TRẢ VỀ (CHỈ PLAIN TEXT):
Nhận xét 1
Nhận xét 2
...
Nhận xét 20
`;
}
```

- **Output Format**: Plain text, one comment per line
- **Count**: 20 comments (mixed quality levels)
- **Flow 1 Processing**: Each line parsed as individual comment, appended to textarea

#### 3. **buildPromptFlow2(lessonDescription, scoreRange)**

```javascript
export function buildPromptFlow2(lessonDescription, scoreRange) {
    const rangeDescription = getScoreRangeDescription(scoreRange);
    const [highRange, midRange, lowRange] = getScoreLevelRanges(scoreRange);

    return `${SYSTEM_PROMPT}

MÔ TẢ BUỔI HỌC:
${lessonDescription}

KHOẢNG ĐIỂM ĐẠI DIỆN CỦA LỚP: ${scoreRange}
${rangeDescription}

HÃY SINH RA 3 NHÓM NHẬN XÉT:

1. HIGH (Điểm cao: ${highRange}) — Học sinh đạt mức CAO
   • Số lượng: 5 nhận xét
   ...

2. MID (Điểm trung bình: ${midRange}) — Học sinh đạt mức TRUNG BÌNH
   • Số lượng: 5 nhận xét
   ...

3. LOW (Điểm thấp: ${lowRange}) — Học sinh có kết quả THẤP HƠN
   • Số lượng: 5 nhận xét
   ...

ĐỊNH DẠNG TRẢ VỀ (CHỈ JSON):
{
  "scoreRange": "${scoreRange}",
  "lessonSummary": "...",
  "commentBank": {
    "HIGH": {
      "range": "${highRange}",
      "comments": ["...", "...", "...", "...", "..."]
    },
    "MID": { ... },
    "LOW": { ... }
  }
}
`;
}
```

- **Output Format**: JSON with HIGH/MID/LOW structure
- **Count**: 15 comments (5 per level)
- **Dynamic Ranges**: Calculated based on scoreRange input
- **Flow 2 Processing**: Parsed as JSON, stored in `window.flow2CommentBank`, formatted for textarea display

#### 4. **Helper Functions**

- `getScoreRangeDescription(scoreRange)`: Returns descriptive text for score ranges
- `getScoreLevelRanges(scoreRange)`: Calculates HIGH/MID/LOW boundaries

---

## Application Layer: `main.js`

### 1. Import Unified Prompts

```javascript
import { buildPromptFlow1, buildPromptFlow2 } from './promptFlow2.js';
```

### 2. Flow 1 Path in `generateCommentsByAI()`

```javascript
if (flowType === 'flow1') {
    const prompt = buildPromptFlow1(lesson);

    const onCommentReceived = (comment) => {
        commentsInput.value += comment + '\n';
    };

    await generateCommentsFromGemini(prompt, onCommentReceived);
}
```

- **Prompt Builder**: `buildPromptFlow1(lesson)`
- **AI Call**: Line-by-line parsing (each line is a comment)
- **Display**: Textarea (can be edited)
- **Count**: 20 comments

### 3. Flow 2 Path in `generateCommentsByAI()`

```javascript
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

- **Prompt Builder**: `buildPromptFlow2(lesson, scoreRange)`
- **AI Call**: JSON mode (entire response is JSON)
- **Display**: Formatted as readable text in textarea (can be edited)
- **Storage**: Cached in globals for script generation

---

## Key Design Decisions

### 1. **Single System Prompt (Shared Foundation)**

- Both flows inherit the same AI instructions and constraints
- Reduces inconsistency between flows
- Easier to update AI behavior globally

### 2. **Two Different Prompt Bodies**

- **Flow 1 Prompt**: Requests 20 diverse comments without categorization
- **Flow 2 Prompt**: Requests 15 comments explicitly organized by score level (HIGH/MID/LOW)
- Same base tone, different structure

### 3. **Differentiated Output Formats**

- Flow 1: Plain text (parseable line-by-line)
- Flow 2: JSON (structured data for categorized display)
- Same lesson description → different output based on what the prompt requests

### 4. **Two-Stage Workflow (Both Flows)**

1. **Generate**: AI creates comments/COMMENT_BANK based on prompt
2. **Edit**: User can review and modify in textarea
3. **Script**: "Tạo Script" generates final output

---

## Testing Checklist

- [ ] **Flow 1**
    - Generates 20 comments with unified prompt
    - Comments appear in textarea (editable)
    - Script generation uses edited textarea content
- [ ] **Flow 2**
    - Generates 15 comments (5 HIGH/5 MID/5 LOW) with unified prompt
    - Comments appear formatted in textarea (editable)
    - Script generation uses stored `window.flow2CommentBank`
- [ ] **Cross-Flow**
    - Switching between Flow 1 & 2 works smoothly
    - Previous flow's data cleared when switching
    - Both flows use same AI tone/style

---

## Benefits

1. ✅ **Unified System**: Single source of truth for comment generation logic
2. ✅ **Maintainability**: Update base prompt once, affects both flows
3. ✅ **Consistency**: Both flows share core AI instructions
4. ✅ **Flexibility**: Each flow can still have its specific output structure
5. ✅ **Clarity**: Code shows explicit `buildPromptFlow1()` vs `buildPromptFlow2()` distinction

---

## Migration from Previous System

### Before

- Flow 1: Implicit prompt (in server-side gemini.js)
- Flow 2: Separate explicit prompt (promptFlow2.js with `buildFlow2Prompt()`)
- Prompts evolved separately, potential for inconsistency

### After

- Flow 1: Explicit unified prompt (`buildPromptFlow1()`)
- Flow 2: Explicit unified prompt (`buildPromptFlow2()`)
- Both inherit same SYSTEM_PROMPT
- Easier to evolve consistently

---

## Future Enhancements

1. **Prompt Versioning**: Tag prompt versions (v1, v2, etc.) if AI behavior changes
2. **A/B Testing**: Try different prompt variations and compare results
3. **Temperature Control**: Adjust AI creativity per flow if needed
4. **Token Optimization**: Monitor token usage of different prompt structures
