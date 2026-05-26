import { SessionReportView } from '../reports/models/report.models.js';
import { GenerateQuestionsDto } from './dto/generate-questions.dto.js';
import { RecognizeQuestionImageDto } from './dto/recognize-question-image.dto.js';

export function buildQuestionPrompt(dto: GenerateQuestionsDto): string {
  return [
    '你是中小学学科教研专家和 AI 教学助手。',
    '请根据教师输入生成适合纸质答题卡作答的课堂检测题，题目必须是标准 ABCD 单选题。',
    '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
    'JSON 格式为 {"items":[...]}。',
    '每道题必须包含 stem、options、answer、explanation、knowledgePoints、difficulty、commonMistakes。',
    'options 必须包含 A、B、C、D 四个字段。',
    'answer 必须是 A、B、C、D 之一。',
    '题目不得超纲，不得有歧义，答案必须唯一。',
    '四个选项必须互斥，不要使用“以上都对”“以上都不对”“无法判断”等模糊选项。',
    '解析必须说明正确答案为什么正确，并简要指出其他选项的问题。',
    `学科：${dto.subject}`,
    `年级：${dto.grade}`,
    `教材版本：${dto.textbookVersion ?? '未指定'}`,
    `知识点：${dto.knowledgePoint}`,
    `教师描述：${dto.description ?? '未提供'}`,
    `题目数量：${dto.count}`,
    `难度：${dto.difficulty}`,
    `题型：${dto.questionType}`
  ].join('\n');
}

export function buildImageQuestionPrompt(dto: RecognizeQuestionImageDto): string {
  return [
    '请读取图片内容，并生成适合纸质答题卡采集的标准 ABCD 单选题。',
    '图片可能是选择题，也可能是课本文字、知识点、板书、练习题或一段说明。',
    '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
    'JSON 格式为 {"items":[...]}。',
    '每个 item 必须包含 stem、options、answer、explanation、knowledgePoints、difficulty、commonMistakes。',
    'options 必须包含 A、B、C、D 四个非空字段。',
    'answer 必须是 A、B、C、D 之一，且答案唯一。',
    '如果图片本身是选择题，先识别原题，再整理或改写为标准 ABCD 单选题。',
    '如果图片不是选择题，请提炼核心知识点，并围绕该知识点生成选择题。',
    '不要使用“以上都对”“以上都不对”“无法判断”等模糊选项。',
    '题干必须完整描述问题，不能依赖“如图所示”。',
    `学科：${dto.subject}`,
    `年级：${dto.grade}`,
    `题目数量：${dto.count ?? 1}`,
    `难度：${dto.difficulty ?? '基础'}`,
    `教师补充要求：${dto.instruction ?? '未提供'}`
  ].join('\n');
}

export function buildSessionDiagnosisPrompt(report: SessionReportView): string {
  const payload = report.questions.map((item) => ({
    questionId: item.questionId,
    knowledgePoints: item.knowledgePoints,
    difficulty: item.difficulty,
    answer: item.answer,
    stats: item.stats
  }));
  return [
    '你是中小学课堂形成性评价专家。',
    '请基于匿名聚合答题统计生成课堂错因诊断。',
    '不得输出学生姓名、学号、卡号或任何个人身份信息。',
    '必须只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
    'JSON 格式为 {"items":[...]}。',
    '每个 item 必须包含 questionId、riskLevel、mainMisconception、evidence、teachingSuggestion、followUpAction。',
    'riskLevel 只能是 low、medium、high。',
    `课堂标题：${report.title}`,
    `统计数据：${JSON.stringify(payload)}`
  ].join('\n');
}
