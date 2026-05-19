# 智答课堂 AI MVP API 草案

## 1. 约定

- API 前缀：`/api`
- 请求和响应使用 JSON。
- 认证使用 Bearer Token。
- 时间使用 ISO 8601 字符串。
- 字段命名使用 camelCase。

## 2. 认证

### POST /api/auth/login

请求：

```json
{
  "phone": "13800000000",
  "password": "password"
}
```

响应：

```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_001",
    "name": "王老师",
    "role": "teacher"
  }
}
```

## 3. 班级

### POST /api/classes

创建班级。

```json
{
  "grade": "七年级",
  "name": "1班"
}
```

### GET /api/classes

查询当前教师可见班级列表。

### PUT /api/classes/{classId}

修改班级。

### DELETE /api/classes/{classId}

删除班级及班级下学生。

## 4. 学生

### POST /api/classes/{classId}/students/import

导入学生。

```json
{
  "students": [
    {
      "studentNo": "20260101",
      "name": "张某某",
      "cardCode": "C001"
    }
  ]
}
```

响应必须包含导入成功数量和错误行号。

### GET /api/classes/{classId}/students

查询班级学生列表。

### PUT /api/classes/{classId}/students/{studentId}

修改学生信息和答题卡绑定。

### DELETE /api/classes/{classId}/students/{studentId}

删除学生。

## 5. 题目

### POST /api/questions

```json
{
  "subject": "数学",
  "grade": "七年级",
  "stem": "下列不等式变形正确的是？",
  "options": {
    "A": "...",
    "B": "...",
    "C": "...",
    "D": "..."
  },
  "answer": "C",
  "explanation": "...",
  "knowledgePoints": ["不等式性质"],
  "difficulty": "基础"
}
```

### GET /api/questions

查询题库。

### POST /api/questions/import

批量导入题目。

### PUT /api/questions/{questionId}

修改题目。

### DELETE /api/questions/{questionId}

删除题目。

## 6. 课堂活动

### POST /api/sessions

```json
{
  "classId": "class_001",
  "title": "一元一次不等式出口检测",
  "mode": "exit_ticket",
  "questionIds": ["question_001", "question_002"]
}
```

### POST /api/sessions/{sessionId}/start

开始课堂活动。

### POST /api/sessions/{sessionId}/end

结束课堂活动并触发报告生成。

### GET /api/sessions/{sessionId}

查询课堂活动详情。

## 7. 答题结果

### POST /api/sessions/{sessionId}/answers/batch

```json
{
  "questionId": "question_001",
  "deviceId": "simulator_001",
  "answers": [
    {
      "cardCode": "C001",
      "selectedOption": "A",
      "recognitionScore": 0.98,
      "recognizedAt": "2026-05-14T10:20:30+08:00"
    }
  ]
}
```

### GET /api/sessions/{sessionId}/questions/{questionId}/stats

```json
{
  "total": 45,
  "answered": 42,
  "unanswered": 3,
  "optionStats": {
    "A": 10,
    "B": 5,
    "C": 25,
    "D": 2
  },
  "correctRate": 0.595
}
```

### GET /api/sessions/{sessionId}/questions/{questionId}/participants

查询当前题目学生答题状态。默认 `displayName` 使用脱敏姓名。

如需显示原始姓名，可追加查询参数：

```text
?showRealNames=true
```

```json
[
  {
    "studentId": "student_001",
    "studentNo": "20260101",
    "displayName": "张同学#abc123",
    "cardCode": "C001",
    "answered": true,
    "selectedOption": "C",
    "isCorrect": true,
    "recognizedAt": "2026-05-14T10:20:30.000Z"
  },
  {
    "studentId": "student_002",
    "studentNo": "20260102",
    "displayName": "李同学#def456",
    "cardCode": "C002",
    "answered": false
  }
]
```

## 8. AI

### POST /api/ai/questions/generate

生成题目草稿。

请求：

```json
{
  "subject": "数学",
  "grade": "七年级",
  "knowledgePoint": "不等式性质",
  "count": 1,
  "difficulty": "基础",
  "questionType": "single_choice",
  "textbookVersion": "人教版"
}
```

响应：

```json
{
  "items": [
    {
      "stem": "下列不等式变形正确的是？",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "answer": "C",
      "explanation": "...",
      "knowledgePoints": ["不等式性质"],
      "difficulty": "基础",
      "commonMistakes": ["..."],
      "aiGenerated": true,
      "reviewStatus": "pending"
    }
  ],
  "notice": "AI 生成内容，请教师审核后使用。"
}
```

### POST /api/ai/sessions/{sessionId}/diagnose

基于课堂答题分布生成错因分析和讲评建议。

响应：

```json
{
  "sessionId": "session_001",
  "generatedAt": "2026-05-15T15:30:00.000Z",
  "source": "rule",
  "items": [
    {
      "questionId": "question_001",
      "riskLevel": "medium",
      "mainMisconception": "学生理解存在分化，可能混淆题目中的限制条件。",
      "evidence": "已答 60/60，正确率 50%，未答 0。",
      "teachingSuggestion": "存在明显分化，建议针对集中错误选项进行讲评。",
      "followUpAction": "用 2 道变式题区分相近概念。"
    }
  ],
  "record": {
    "id": "record_001",
    "type": "session_diagnosis",
    "sessionId": "session_001",
    "status": "fallback",
    "source": "rule",
    "createdAt": "2026-05-15T15:30:00.000Z"
  },
  "notice": "AI 生成内容，请教师审核后使用。"
}
```

### GET /api/ai/records

查询 AI 生成记录。
