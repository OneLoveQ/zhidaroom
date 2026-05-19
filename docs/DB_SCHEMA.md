# 智答课堂 AI MVP 数据库设计草案

## 1. 设计原则

- 最小化采集学生个人信息。
- 学生姓名需要加密或脱敏存储，MVP 阶段先在模型中明确安全要求。
- 答题卡编号不直接等于学号。
- 大屏查询接口默认不返回学生姓名。
- AI 调用记录必须保留，方便审核和追溯。

## 2. 核心表

### users

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 用户 ID |
| school_id | uuid | 学校 ID |
| name | varchar | 姓名 |
| phone | varchar | 手机号 |
| role | varchar | teacher/admin/researcher |
| password_hash | varchar | 密码哈希 |
| status | varchar | 状态 |
| created_at | timestamptz | 创建时间 |

### schools

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 学校 ID |
| name | varchar | 学校名称 |
| region_code | varchar | 行政区划 |
| deployment_type | varchar | SaaS/private |
| created_at | timestamptz | 创建时间 |

### classes

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 班级 ID |
| school_id | uuid | 学校 ID |
| grade | varchar | 年级 |
| name | varchar | 班级名称 |
| head_teacher_id | uuid | 班主任 |
| created_at | timestamptz | 创建时间 |

### students

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 学生 ID |
| class_id | uuid | 班级 ID |
| student_no | varchar | 学号 |
| name_encrypted | varchar | 加密姓名 |
| status | varchar | 状态 |
| created_at | timestamptz | 创建时间 |

### cards

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 卡片记录 ID |
| card_code | varchar | 卡片编号 |
| card_version | varchar | 卡片版本 |
| student_id | uuid | 绑定学生 |
| class_id | uuid | 绑定班级 |
| status | varchar | normal/lost/disabled |

### questions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 题目 ID |
| creator_id | uuid | 创建人 |
| subject | varchar | 学科 |
| grade | varchar | 年级 |
| stem | text | 题干 |
| options | jsonb | A/B/C/D 选项 |
| answer | varchar | 正确答案 |
| explanation | text | 解析 |
| knowledge_points | jsonb | 知识点 |
| difficulty | varchar | 难度 |
| source | varchar | manual/ai/import |
| ai_generated | boolean | 是否 AI 生成 |
| review_status | varchar | draft/pending/approved/rejected |

### classroom_sessions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 活动 ID |
| teacher_id | uuid | 教师 ID |
| class_id | uuid | 班级 ID |
| title | varchar | 活动标题 |
| mode | varchar | exit_ticket/quiz/vote |
| status | varchar | draft/active/ended |
| started_at | timestamptz | 开始时间 |
| ended_at | timestamptz | 结束时间 |

### session_questions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | ID |
| session_id | uuid | 活动 ID |
| question_id | uuid | 题目 ID |
| order_no | integer | 顺序 |
| time_limit | integer | 限时秒数 |

### answers

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 答题记录 ID |
| session_id | uuid | 活动 ID |
| question_id | uuid | 题目 ID |
| student_id | uuid | 学生 ID |
| card_code | varchar | 卡片编号 |
| selected_option | varchar | 学生答案 |
| is_correct | boolean | 是否正确 |
| recognized_at | timestamptz | 识别时间 |
| recognition_score | float | 识别置信度 |
| device_id | varchar | 扫码设备 |

### ai_generations

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 记录 ID |
| user_id | uuid | 使用人 |
| type | varchar | question/diagnosis/report |
| prompt | text | 输入提示 |
| output | jsonb | 输出内容 |
| model_name | varchar | 模型名称 |
| reviewed | boolean | 是否审核 |
| created_at | timestamptz | 创建时间 |

