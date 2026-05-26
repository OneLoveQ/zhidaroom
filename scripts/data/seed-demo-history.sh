#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_PATH="${SQLITE_DB_PATH:-${ROOT_DIR}/data/zhida.dev.db}"
export SQLITE_DB_PATH="${DB_PATH}"

mkdir -p "${ROOT_DIR}/data/backups"
if [[ -f "${DB_PATH}" ]]; then
  cp "${DB_PATH}" "${ROOT_DIR}/data/backups/zhida.dev.before-demo-history.$(date +%Y%m%d%H%M%S).db"
fi

node --input-type=module <<'NODE'
import { randomUUID } from 'node:crypto';
const { DatabaseSync } = await import('node:sqlite');

const db = new DatabaseSync(process.env.SQLITE_DB_PATH);
db.exec('PRAGMA foreign_keys = OFF');

const now = new Date('2026-05-25T08:00:00.000Z');
const targetEmail = process.env.DEMO_TEACHER_EMAIL ?? 'oneloveq@qq.com';
const targetUser = db.prepare(`
  SELECT u.id AS user_id, u.display_name, w.id AS workspace_id
  FROM users u
  JOIN workspace_members m ON m.user_id = u.id
  JOIN workspaces w ON w.id = m.workspace_id
  WHERE u.email = ?
  ORDER BY m.created_at DESC
  LIMIT 1
`).get(targetEmail);
const workspaceId = targetUser?.workspace_id ?? 'demo_workspace';
const teacherId = targetUser?.user_id ?? 'teacher_demo';
const classId = 'demo_class_501';
const deviceId = 'demo_mobile_scanner';

const names = [
  '赵子涵', '钱雨桐', '孙明轩', '李欣怡', '周思远', '吴若曦', '郑宇航', '王诗涵', '冯嘉懿', '陈一诺',
  '褚浩然', '卫梓轩', '蒋子墨', '沈语晨', '韩书瑶', '杨景行', '朱安然', '秦沐阳', '尤可欣', '许星辰',
  '何雨泽', '吕佳宁', '施文博', '张明朗', '孔思齐', '曹若涵', '严知行', '华予安', '金晨曦', '魏嘉禾',
  '陶亦辰', '姜若宁', '戚子昂', '谢沐辰', '邹雨欣', '喻思源', '柏书言', '水清扬', '窦晨阳', '章可为',
  '云舒然', '苏念一', '潘明哲', '葛昕怡', '奚若谷', '范子睿', '彭雨诺', '郎星泽', '鲁嘉树', '韦思成',
  '昌语桐', '马天佑', '苗若初', '凤嘉宁', '花知夏', '方明远', '俞欣然', '任书航', '袁一鸣', '柳清越'
];

const questions = [
  ['数学', '五年级', '3/4 和 2/3 比较，哪个更大？', ['3/4', '2/3', '一样大', '无法比较'], 'A', '通分后 3/4 = 9/12，2/3 = 8/12，所以 3/4 更大。', ['分数比较', '通分'], '巩固', true],
  ['数学', '五年级', '一个三角形的底是 10 厘米，高是 6 厘米，面积是多少？', ['30平方厘米', '60平方厘米', '16平方厘米', '40平方厘米'], 'A', '三角形面积 = 底 × 高 ÷ 2 = 30 平方厘米。', ['三角形面积'], '基础', false],
  ['数学', '五年级', '把 0.75 化成最简分数是？', ['3/4', '75/10', '7/5', '1/4'], 'A', '0.75 = 75/100 = 3/4。', ['小数与分数互化'], '巩固', true],
  ['数学', '五年级', '一根绳子长 2 米，用去 3/5，还剩多少米？', ['2/5米', '4/5米', '6/5米', '3/5米'], 'B', '剩下 2 × (1 - 3/5) = 4/5 米。', ['分数乘法', '单位1'], '提升', true],
  ['语文', '五年级', '“囫囵吞枣”通常用来形容什么？', ['吃得很慢', '理解得很透彻', '读书不求甚解', '非常仔细'], 'C', '囫囵吞枣比喻学习或阅读不加分析地笼统接受。', ['成语理解'], '巩固', false],
  ['语文', '五年级', '下列句子中使用了拟人修辞的是？', ['小河唱着歌向前流。', '天空很蓝。', '我喜欢读书。', '操场上有很多人。'], 'A', '“唱着歌”把小河当作人来写。', ['修辞手法'], '巩固', true],
  ['英语', '五年级', 'I usually ____ breakfast at 7:00.', ['have', 'has', 'having', 'had'], 'A', '主语 I 后一般现在时用 have。', ['一般现在时'], '巩固', false],
  ['英语', '五年级', 'There ____ many books on the desk.', ['is', 'are', 'am', 'be'], 'B', 'many books 是复数，there be 结构用 are。', ['There be句型'], '巩固', true],
  ['科学', '五年级', '植物蒸腾作用主要通过什么部位进行？', ['根', '叶', '果实', '种子'], 'B', '植物蒸腾作用主要通过叶片气孔进行。', ['植物生理'], '基础', false],
  ['科学', '五年级', '电路中开关的主要作用是什么？', ['提供电能', '控制电路通断', '消耗电能', '改变导线颜色'], 'B', '开关用于控制电路接通或断开。', ['简单电路'], '基础', true],
  ['道德与法治', '五年级', '遇到网络陌生人索要家庭住址时，正确做法是？', ['直接告诉对方', '拒绝并告知家长或老师', '随便编一个', '约对方见面'], 'B', '个人隐私信息不能随意透露，应及时告知家长或老师。', ['网络安全'], '基础', false],
  ['数学', '五年级', '一个数的 1/4 是 12，这个数是多少？', ['3', '16', '36', '48'], 'D', '已知部分求整体，用 12 ÷ 1/4 = 48。', ['分数除法雏形'], '提升', true],
  ['数学', '五年级', '5/6 - 1/3 = ?', ['4/3', '1/2', '2/3', '5/3'], 'B', '1/3 = 2/6，5/6 - 2/6 = 3/6 = 1/2。', ['异分母分数减法', '通分'], '巩固', true],
  ['数学', '五年级', '2.4 × 0.5 = ?', ['1.2', '12', '0.12', '2.9'], 'A', '2.4 的一半是 1.2。', ['小数乘法'], '基础', false],
  ['数学', '五年级', '一个长方体有多少个面？', ['4个', '6个', '8个', '12个'], 'B', '长方体有 6 个面。', ['长方体认识'], '基础', false],
  ['数学', '五年级', '下面哪个数是 24 的因数？', ['5', '7', '8', '10'], 'C', '24 ÷ 8 = 3，所以 8 是 24 的因数。', ['因数和倍数'], '基础', true],
  ['数学', '五年级', '把 3.06 扩大到原来的 100 倍是？', ['30.6', '306', '0.306', '3060'], 'B', '小数点向右移动两位，3.06 变为 306。', ['小数点移动'], '基础', false],
  ['语文', '五年级', '“不耻下问”中的“耻”意思是？', ['羞耻、认为可耻', '牙齿', '停止', '迟到'], 'A', '不耻下问指不把向地位学问不如自己的人请教看作可耻。', ['文言词语', '成语理解'], '提升', true],
  ['语文', '五年级', '下列词语中书写正确的是？', ['迫不急待', '再接再厉', '穿流不息', '谈笑风声'], 'B', '正确写法是“再接再厉”。', ['字形辨析'], '巩固', false],
  ['语文', '五年级', '“桂花开了，十里飘香”主要运用了什么写法？', ['夸张', '设问', '排比', '反问'], 'A', '“十里飘香”夸大香味传播范围，属于夸张。', ['修辞手法'], '巩固', true],
  ['语文', '五年级', '阅读说明文时，最应关注的是？', ['人物外貌', '说明对象和说明方法', '故事结局', '押韵方式'], 'B', '说明文重点关注说明对象、特征和说明方法。', ['说明文阅读'], '基础', true],
  ['英语', '五年级', 'She ____ to school by bus every day.', ['go', 'goes', 'going', 'went'], 'B', '主语 She 是第三人称单数，一般现在时动词用 goes。', ['一般现在时', '第三人称单数'], '巩固', true],
  ['英语', '五年级', 'What is the opposite of “hot”?', ['cold', 'warm', 'cooler', 'sunny'], 'A', 'hot 的反义词是 cold。', ['反义词', '基础词汇'], '基础', false],
  ['英语', '五年级', 'We have music ____ Monday.', ['in', 'on', 'at', 'to'], 'B', '具体星期前用介词 on。', ['时间介词'], '巩固', true],
  ['英语', '五年级', 'Which one is a vegetable?', ['apple', 'carrot', 'banana', 'milk'], 'B', 'carrot 是胡萝卜，属于蔬菜。', ['生活词汇'], '基础', false],
  ['科学', '五年级', '声音传播需要什么？', ['真空', '介质', '阳光', '磁铁'], 'B', '声音传播需要空气、水、固体等介质。', ['声音传播'], '基础', true],
  ['科学', '五年级', '下列哪种材料容易导电？', ['铜丝', '木棒', '塑料尺', '橡皮'], 'A', '铜是金属，容易导电。', ['导体和绝缘体'], '基础', false],
  ['科学', '五年级', '食物链中植物通常属于什么？', ['生产者', '消费者', '分解者', '捕食者'], 'A', '植物能制造养分，通常是生产者。', ['生态系统'], '巩固', true],
  ['科学', '五年级', '月亮本身会发光吗？', ['会', '不会，反射太阳光', '只在晚上会', '只在满月会'], 'B', '月亮本身不发光，我们看到的是它反射的太阳光。', ['月相与光'], '基础', false],
  ['道德与法治', '五年级', '班级讨论时出现不同意见，合适做法是？', ['打断别人', '认真倾听并表达理由', '嘲笑同学', '拒绝交流'], 'B', '讨论时应尊重他人，表达理由，共同协商。', ['公共参与', '沟通合作'], '基础', false]
];

const sessionPlans = [
  ['分数比较课前诊断', '数学', [0, 2, 12, 15], [0.56, 0.52, 0.45, 0.61]],
  ['三角形面积随堂检测', '数学', [1, 3, 11], [0.82, 0.47, 0.39]],
  ['小数与分数互化巩固', '数学', [2, 13, 16, 28], [0.63, 0.71, 0.66, 0.74]],
  ['成语理解出口检测', '语文', [4, 18, 19], [0.76, 0.58, 0.69]],
  ['修辞手法随堂反馈', '语文', [5, 20, 21], [0.61, 0.56, 0.64]],
  ['一般现在时检测', '英语', [6, 22, 24], [0.84, 0.59, 0.62]],
  ['There be 句型巩固', '英语', [7, 23, 24], [0.65, 0.88, 0.72]],
  ['植物与生态基础检测', '科学', [8, 26, 27], [0.75, 0.59, 0.68]],
  ['简单电路出口检测', '科学', [9, 25, 26], [0.86, 0.72, 0.63]],
  ['网络安全主题检测', '道德与法治', [10, 28, 29], [0.92, 0.86, 0.78]],
  ['分数应用题讲评前测', '数学', [3, 11, 12, 15], [0.48, 0.46, 0.57, 0.62]],
  ['分数应用题讲评后测', '数学', [3, 11, 12, 15], [0.69, 0.63, 0.74, 0.78]],
  ['语文字词综合检测', '语文', [4, 18, 19, 20], [0.82, 0.67, 0.76, 0.81]],
  ['英语综合出口检测', '英语', [6, 7, 22, 23, 24], [0.91, 0.76, 0.72, 0.9, 0.8]],
  ['科学综合出口检测', '科学', [8, 9, 25, 26, 27], [0.86, 0.91, 0.8, 0.73, 0.78]],
  ['小数计算巩固检测', '数学', [13, 16, 28], [0.82, 0.79, 0.88]],
  ['阅读方法随堂检测', '语文', [19, 20, 21, 18], [0.83, 0.72, 0.77, 0.86]],
  ['跨学科基础知识检测', '综合', [10, 23, 25, 29], [0.95, 0.92, 0.86, 0.83]],
  ['期末复习薄弱点追踪', '数学', [0, 3, 11, 12, 15], [0.86, 0.74, 0.7, 0.82, 0.84]],
  ['期末复习综合出口检测', '综合', [1, 5, 7, 8, 10, 22], [0.94, 0.81, 0.84, 0.88, 0.96, 0.89]],
  ['分数错题二次追踪', '数学', [0, 3, 12, 13], [0.9, 0.78, 0.86, 0.88]],
  ['语文阅读迁移练习', '语文', [18, 19, 20, 21], [0.84, 0.8, 0.83, 0.78]],
  ['英语语法回看检测', '英语', [6, 7, 22, 24], [0.93, 0.84, 0.81, 0.86]],
  ['科学概念回看检测', '科学', [8, 9, 26, 27], [0.9, 0.94, 0.82, 0.84]]
];

const sessions = sessionPlans.map(([title, subject, questionIndexes, baseRates], index) => ({
  id: `demo_session_${String(index + 1).padStart(2, '0')}`,
  title: `五年级2班 ${title}`,
  subject,
  teacherName: '陈老师',
  dateOffset: -39 + index * 2,
  runs: createRuns(index, questionIndexes, baseRates)
}));

function createRuns(sessionIndex, questionIndexes, baseRates) {
  const firstRun = {
    id: `demo_run_${String(sessionIndex + 1).padStart(2, '0')}_01`,
    title: sessionIndex % 5 === 0 ? '课前诊断' : '出口检测',
    questionIndexes,
    rates: baseRates
  };
  if (sessionIndex % 5 !== 1) return [firstRun];
  return [
    firstRun,
    {
      id: `demo_run_${String(sessionIndex + 1).padStart(2, '0')}_02`,
      title: '讲评后复测',
      questionIndexes: questionIndexes.slice(0, Math.min(3, questionIndexes.length)),
      rates: baseRates.slice(0, Math.min(3, baseRates.length)).map((rate) => Math.min(rate + 0.14, 0.96))
    }
  ];
}

const optionDistractors = { A: ['B', 'C', 'D'], B: ['A', 'C', 'D'], C: ['B', 'A', 'D'], D: ['C', 'B', 'A'] };

function isoWithOffset(dayOffset, minuteOffset = 0) {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + dayOffset);
  value.setUTCMinutes(value.getUTCMinutes() + minuteOffset);
  return value.toISOString();
}

function stableCorrect(studentIndex, questionIndex, targetRate) {
  const score = ((studentIndex * 37 + questionIndex * 19 + 11) % 100) / 100;
  return score < targetRate;
}

function selectedOption(answer, studentIndex, questionIndex) {
  return optionDistractors[answer][(studentIndex + questionIndex) % 3];
}

function run(statement, ...params) {
  statement.run(...params);
}

db.exec('BEGIN');
try {
  db.prepare('DELETE FROM ai_diagnosis_records').run();
  db.prepare('DELETE FROM answers').run();
  db.prepare('DELETE FROM assessment_run_questions').run();
  db.prepare('DELETE FROM assessment_runs').run();
  db.prepare('DELETE FROM session_questions').run();
  db.prepare('DELETE FROM sessions').run();
  db.prepare('DELETE FROM questions').run();
  db.prepare('DELETE FROM students').run();
  db.prepare('DELETE FROM classes').run();

  if (!targetUser) {
    db.prepare(`
      INSERT OR IGNORE INTO workspaces (id, type, name, school_name, owner_user_id, created_at)
      VALUES (?, 'school', '智答课堂演示空间', '智答实验学校', ?, ?)
    `).run(workspaceId, teacherId, isoWithOffset(-20));

    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, display_name, phone, school, subject, status, created_at, role)
      VALUES (?, 'demo.teacher@zhida.local', 'demo_hash', '陈老师', '13900000000', '智答实验学校', '数学', 'active', ?, 'teacher')
    `).run(teacherId, isoWithOffset(-20));

    db.prepare(`
      INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, status, created_at)
      VALUES (?, ?, ?, 'owner', 'active', ?)
    `).run('demo_workspace_member', workspaceId, teacherId, isoWithOffset(-20));
  }

  db.prepare(`
    INSERT INTO classes (id, school_id, grade, name, head_teacher_id, created_at, workspace_id)
    VALUES (?, 'school_demo', '五年级', '2班', ?, ?, ?)
  `).run(classId, teacherId, isoWithOffset(-18), workspaceId);

  const insertStudent = db.prepare(`
    INSERT INTO students (id, class_id, student_no, name_raw, name_encrypted, card_code, status, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);
  names.forEach((name, index) => {
    const no = String(index + 1).padStart(2, '0');
    insertStudent.run(
      `demo_student_${no}`,
      classId,
      `502${no}`,
      name,
      `${name[0]}同学#demo${no}`,
      `C${String(index + 1).padStart(3, '0')}`,
      isoWithOffset(-18, index),
      workspaceId
    );
  });

  const insertQuestion = db.prepare(`
    INSERT INTO questions
      (id, creator_id, subject, grade, stem, options_json, answer, explanation, knowledge_points_json,
       difficulty, source, ai_generated, review_status, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
  `);
  questions.forEach((item, index) => {
    const [subject, grade, stem, options, answer, explanation, points, difficulty, aiGenerated] = item;
    insertQuestion.run(
      `demo_question_${String(index + 1).padStart(2, '0')}`,
      teacherId,
      subject,
      grade,
      stem,
      JSON.stringify({ A: options[0], B: options[1], C: options[2], D: options[3] }),
      answer,
      explanation,
      JSON.stringify(points),
      difficulty,
      aiGenerated ? 'ai' : 'manual',
      aiGenerated ? 1 : 0,
      isoWithOffset(-16, index),
      workspaceId
    );
  });

  const insertSession = db.prepare(`
    INSERT INTO sessions
      (id, teacher_id, class_id, title, mode, status, teacher_name, subject, classroom_code,
       started_at, ended_at, created_at, stage, current_question_id, auto_advance_at, workspace_id, teacher_user_id, deleted_at)
    VALUES (?, ?, ?, ?, 'exit_ticket', 'ended', ?, ?, ?, ?, ?, ?, 'session_report', ?, NULL, ?, ?, NULL)
  `);
  const insertSessionQuestion = db.prepare('INSERT INTO session_questions (session_id, question_id, order_no) VALUES (?, ?, ?)');
  const insertRun = db.prepare(`
    INSERT INTO assessment_runs
      (id, session_id, title, type, status, stage, current_question_id, started_at, completed_at, created_at)
    VALUES (?, ?, ?, 'exit_ticket', 'completed', 'result', ?, ?, ?, ?)
  `);
  const insertRunQuestion = db.prepare('INSERT INTO assessment_run_questions (run_id, question_id, order_no) VALUES (?, ?, ?)');
  const insertAnswer = db.prepare(`
    INSERT INTO answers
      (id, run_id, session_id, question_id, student_id, card_code, selected_option, is_correct,
       recognized_at, recognition_score, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const session of sessions) {
    const allQuestionIndexes = [...new Set(session.runs.flatMap((runItem) => runItem.questionIndexes))];
    const firstQuestionId = `demo_question_${String(allQuestionIndexes[0] + 1).padStart(2, '0')}`;
    insertSession.run(
      session.id,
      teacherId,
      classId,
      session.title,
      session.teacherName,
      session.subject,
      session.title,
      isoWithOffset(session.dateOffset, 10),
      isoWithOffset(session.dateOffset, 50),
      isoWithOffset(session.dateOffset),
      firstQuestionId,
      workspaceId,
      teacherId
    );
    allQuestionIndexes.forEach((questionIndex, orderIndex) => {
      insertSessionQuestion.run(session.id, `demo_question_${String(questionIndex + 1).padStart(2, '0')}`, orderIndex + 1);
    });

    for (const [runIndex, runItem] of session.runs.entries()) {
      const runStarted = isoWithOffset(session.dateOffset, 12 + runIndex * 15);
      const runEnded = isoWithOffset(session.dateOffset, 22 + runIndex * 15);
      const runFirstQuestionId = `demo_question_${String(runItem.questionIndexes[0] + 1).padStart(2, '0')}`;
      insertRun.run(runItem.id, session.id, runItem.title, runFirstQuestionId, runStarted, runEnded, runStarted);
      runItem.questionIndexes.forEach((questionIndex, orderIndex) => {
        const questionId = `demo_question_${String(questionIndex + 1).padStart(2, '0')}`;
        const question = questions[questionIndex];
        insertRunQuestion.run(runItem.id, questionId, orderIndex + 1);
        names.forEach((_, studentIndex) => {
          const absent = (studentIndex + questionIndex + runIndex) % 29 === 0;
          if (absent) return;
          const isCorrect = stableCorrect(studentIndex, questionIndex + runIndex * 3, runItem.rates[orderIndex]);
          const no = String(studentIndex + 1).padStart(2, '0');
          const chosen = isCorrect ? question[4] : selectedOption(question[4], studentIndex, questionIndex);
          insertAnswer.run(
            randomUUID(),
            runItem.id,
            session.id,
            questionId,
            `demo_student_${no}`,
            `C${String(studentIndex + 1).padStart(3, '0')}`,
            chosen,
            isCorrect ? 1 : 0,
            isoWithOffset(session.dateOffset, 13 + runIndex * 15 + orderIndex * 2 + (studentIndex % 2)),
            Number((0.91 + ((studentIndex + questionIndex) % 8) / 100).toFixed(2)),
            deviceId
          );
        });
      });
    }
  }

  const diagnosis = {
    summary: '演示数据表明，班级在基础计算题上掌握较好，在分数应用题和单位1理解上存在分化。',
    highlights: ['基础题正确率较高，可快速讲评。', '分数应用题错误集中，建议增加画图和数量关系表达。'],
    risks: ['少数学生连续两轮在分数应用题上出错，需要课后个别跟进。']
  };
  db.prepare(`
    INSERT INTO ai_diagnosis_records
      (id, scope, target_id, class_id, student_id, source, status, range_from, range_to,
       diagnosis_json, recommendations_json, created_at)
    VALUES (?, 'class', ?, ?, NULL, 'model', 'success', ?, ?, ?, ?, ?)
  `).run(
    'demo_ai_diagnosis_class_501',
    classId,
    classId,
    isoWithOffset(-12),
    isoWithOffset(-1),
    JSON.stringify(diagnosis),
    JSON.stringify(['讲评时突出通分、单位1和数量关系。', '对连续错误学生安排同类变式练习。', '下一节课用 2 道出口题复测薄弱点。']),
    isoWithOffset(0)
  );
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
db.exec('PRAGMA foreign_keys = ON');

const counts = Object.fromEntries(
  ['classes', 'students', 'questions', 'sessions', 'assessment_runs', 'answers', 'ai_diagnosis_records']
    .map((table) => [table, db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count])
);
console.log(JSON.stringify({
  dbPath: process.env.SQLITE_DB_PATH,
  targetEmail,
  workspaceId,
  teacherId,
  counts
}, null, 2));
db.close();
NODE
