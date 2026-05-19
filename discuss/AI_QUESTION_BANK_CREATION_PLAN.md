# AI 辅助题库录入规划

## 目标

题库管理支持三种新增方式：

1. 手动输入标准 ABCD 单选题。
2. 拍照后由 Mimo AI 识别或基于图片内容生成标准 ABCD 单选题。
3. 教师通过口述或文本描述，由 Mimo AI 生成标准 ABCD 单选题。

所有 AI 生成的题目都必须先进入“待确认”状态，教师确认或编辑后，才能真正写入题库。

## 核心原则

- 题库最终只保存经过教师确认的题目。
- AI 输出必须是结构化 JSON，不能让前端解析自然语言。
- 后端必须做二次校验，不能只信任模型输出。
- 图片内容不要求本身就是选择题；可以是课本文字、知识点、练习题、板书或一段说明，由 AI 改写成单选题。
- 同一套标准适用于教师端题库页和手机教师端课堂建题页。

## 数据结构

AI 候选题统一使用：

```ts
interface AiQuestionCandidate {
  stem: string;
  options: { A: string; B: string; C: string; D: string };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  knowledgePoints: string[];
  difficulty: '基础' | '巩固' | '提升';
  commonMistakes: string[];
  aiGenerated: true;
  reviewStatus: 'pending';
  sourceMode: 'image' | 'text';
}
```

确认入库时转换成现有 `CreateQuestionPayload`。

## 后端接口设计

保留并增强现有接口：

`POST /api/ai/questions/recognize-image`

用于拍照生成。入参：

```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "subject": "语文",
  "grade": "四年级",
  "difficulty": "基础",
  "count": 1,
  "instruction": "围绕图片内容生成适合课堂检测的选择题"
}
```

`POST /api/ai/questions/generate`

用于口述或文本描述生成。入参：

```json
{
  "subject": "语文",
  "grade": "四年级",
  "knowledgePoint": "春风又绿江南岸中的绿字用法",
  "description": "请根据这个知识点生成一道理解型选择题",
  "difficulty": "基础",
  "count": 1,
  "questionType": "single_choice"
}
```

新增或调整 DTO：

- `GenerateQuestionsDto` 增加 `description?: string`
- `RecognizeQuestionImageDto` 增加 `count?: number`、`difficulty?: string`、`instruction?: string`
- 两个接口都返回候选题，不直接入库

## Mimo 提示词要求

### 通用系统要求

```text
你是小学学科教研专家，负责把教师给出的材料生成课堂即时评测题。
请严格生成适合纸质答题卡采集的 ABCD 单选题。
必须只输出 JSON，不要 Markdown，不要解释性前后缀。
每题必须有且只有一个正确答案。
四个选项必须互斥，不能出现“以上都对/以上都不对/无法判断”等模糊选项。
题干必须适合学生直接阅读，不能依赖“如图所示”除非题干已经完整描述图片内容。
解析必须说明为什么正确答案正确，并简单指出其他选项的问题。
难度只能是：基础、巩固、提升。
```

### 图片生成提示词

```text
请读取图片内容。图片可能是选择题，也可能是课本文字、知识点、板书、练习题或一段说明。

如果图片本身是选择题：
- 先识别原题。
- 如果原题已经是 ABCD 单选题，则整理为标准结构。
- 如果不是标准 ABCD 单选题，则改写为标准 ABCD 单选题。

如果图片不是选择题：
- 提炼图片中的核心知识点。
- 围绕该知识点生成适合课堂检测的 ABCD 单选题。

输出 JSON：
{
  "items": [
    {
      "stem": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer": "A",
      "explanation": "...",
      "knowledgePoints": ["..."],
      "difficulty": "基础",
      "commonMistakes": ["..."]
    }
  ]
}
```

### 文本或口述生成提示词

```text
教师输入可能是口述转写、知识点、教学目标、教材片段或自然语言要求。
请先理解教师意图，再生成指定数量的标准 ABCD 单选题。

输出 JSON：
{
  "items": [
    {
      "stem": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer": "A",
      "explanation": "...",
      "knowledgePoints": ["..."],
      "difficulty": "基础",
      "commonMistakes": ["..."]
    }
  ]
}
```

## 后端校验规则

AI 返回后必须逐题校验：

- `stem` 非空，长度合理。
- `options.A/B/C/D` 全部非空。
- `answer` 必须是 A/B/C/D。
- 正确答案对应选项必须存在。
- `explanation` 非空。
- `knowledgePoints` 至少一个。
- `difficulty` 必须归一化为基础/巩固/提升。
- 去掉 Markdown、序号前缀、空白字符。
- 如果 `items` 里部分题不合格，只返回合格题并给出 warning；如果全不合格，则返回错误。

## 教师端交互设计

题库管理页新增“新增题目”面板，分为三个 Tab：

1. `手动输入`
2. `拍照识别`
3. `AI 生成`

### 手动输入

保持现有表单逻辑：

- 填题干、ABCD、答案、解析、知识点、难度。
- 点击“保存入库”。

### 拍照识别

流程：

1. 选择学科、年级、难度、生成数量。
2. 上传或拍照。
3. 可填写补充要求。
4. 点击“AI 识别/生成”。
5. 显示候选题卡片。
6. 教师可以编辑候选题。
7. 点击“确认加入题库”。

### AI 生成

流程：

1. 选择学科、年级、难度、生成数量。
2. 输入或粘贴文本描述。
3. 点击“AI 生成题目”。
4. 显示候选题卡片。
5. 教师可以编辑候选题。
6. 点击“确认加入题库”。

口述能力可以先用浏览器语音转文字能力做增强；第一版先提供文本框，后续再加“按住说话/开始录音”。

## 候选题确认区

AI 生成后不直接写库，而是在页面下方展示“待确认题目”：

- 每题一张紧凑卡片。
- 展示题干、选项、答案、解析、知识点、难度。
- 支持编辑。
- 支持删除候选题。
- 支持单题确认入库。
- 支持全部确认入库。

确认入库时调用现有 `POST /api/questions`。

## 开发顺序

1. 后端补强 DTO、提示词和 AI 输出校验。
2. 统一图片接口返回 `items`，兼容旧的 `item`。
3. 教师端 API client 增加 `generateQuestions` 和 `recognizeQuestionImage`。
4. 题库页拆分新增面板，避免 `QuestionBank.vue` 超过 300 行。
5. 增加候选题确认组件。
6. 跑通三种模式：
   - 手动保存
   - 图片生成候选题，确认入库
   - 文本描述生成候选题，确认入库
7. 增加测试：
   - AI 输出格式校验
   - 非选择题图片可生成标准选择题
   - 未确认候选题不会进入题库

## 风险与约束

- 图片识别质量依赖 Mimo 视觉能力，前端要允许教师编辑。
- 语音口述第一版建议先做“文本描述”，语音转文字作为后续增强。
- AI 生成内容不能直接用于学生测评，必须保留教师确认按钮。
- `apps/web-teacher/src/components/QuestionBank.vue` 当前已经接近复杂组件，应在实现时拆出子组件，避免超过 300 行并降低状态耦合。
