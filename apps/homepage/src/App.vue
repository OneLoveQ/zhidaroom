<script setup lang="ts">
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LineChart,
  LockKeyhole,
  QrCode,
  ScanLine,
  School,
  ShieldCheck,
  Smartphone,
  UsersRound
} from 'lucide-vue-next';
import classroomImage from './assets/classroom-scan.png';

type FlowStep = {
  title: string;
  description: string;
  icon: typeof ClipboardCheck;
};

type Capability = {
  title: string;
  description: string;
  icon: typeof UsersRound;
};

const stats = [
  { value: '30-90 秒', label: '完成一次全班反馈' },
  { value: '0 学生设备', label: '不用手机、平板或账号' },
  { value: 'A-D', label: '旋转纸卡即可作答' }
] as const;

const flowSteps: FlowStep[] = [
  { title: '出题', description: '教师创建出口检测题，也可由 AI 辅助生成单选题。', icon: ClipboardCheck },
  { title: '举卡', description: '学生使用专属纸质答题卡，旋转方向选择 A/B/C/D。', icon: QrCode },
  { title: '扫码', description: '教师手机扫过教室，系统汇总卡号、选项和置信度。', icon: ScanLine },
  { title: '诊断', description: '大屏实时统计，AI 生成错因分析、讲评建议和报告。', icon: BrainCircuit }
];

const capabilities: Capability[] = [
  { title: '常态课堂即时反馈', description: '适合导入、概念辨析、随堂检测和出口检测，不依赖学生端设备。', icon: UsersRound },
  { title: 'AI 讲评与课后报告', description: '围绕错误选项、知识点和班级掌握率，生成可审核的教学建议。', icon: BrainCircuit },
  { title: '本土题库与班级管理', description: '支持班级、学生、题库和活动闭环，贴合中国中小学管理方式。', icon: School },
  { title: '数据最小化设计', description: '默认不上传课堂视频和学生图像，只沉淀答题与教学诊断数据。', icon: ShieldCheck }
];

const aiFindings = [
  { label: '概念理解不稳', percent: '46%' },
  { label: '计算步骤遗漏', percent: '32%' },
  { label: '审题信息漏读', percent: '22%' }
] as const;

function resolveAppUrl(app: 'teacher' | 'screen'): string {
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = app === 'teacher' ? '5173' : '5174';
    return `${protocol}//${hostname}:${port}/`;
  }
  return `${window.location.origin}/${app}/`;
}

function goTo(app: 'teacher' | 'screen'): void {
  window.location.assign(resolveAppUrl(app));
}
</script>

<template>
  <main class="site-shell">
    <header class="top-nav">
      <a class="brand" href="#" aria-label="智答课堂 AI 首页">
        <span class="brand-mark"><CheckCircle2 :size="24" /></span>
        <span>
          <strong>智答课堂 AI</strong>
          <small>zhida.foun.fun</small>
        </span>
      </a>
      <nav aria-label="主导航">
        <a href="#loop">课堂闭环</a>
        <a href="#capabilities">核心能力</a>
        <a href="#flow">使用流程</a>
        <a href="#security">数据安全</a>
      </nav>
      <div class="nav-actions">
        <button type="button" class="primary" @click="goTo('teacher')">进入教师端</button>
        <button type="button" class="secondary" @click="goTo('screen')">查看课堂大屏</button>
      </div>
    </header>

    <section class="hero" id="loop">
      <div class="hero-copy">
        <h1>纸卡举一举，全班学情马上看见</h1>
        <p>
          无需学生设备，用教师手机扫码完成课堂即时反馈，并由 AI 生成错因分析、
          讲评建议与课后报告。
        </p>
        <div class="hero-actions">
          <button type="button" class="primary large" @click="goTo('teacher')">
            进入教师端 <ArrowRight :size="18" />
          </button>
          <button type="button" class="secondary large" @click="goTo('screen')">
            查看课堂大屏 <BarChart3 :size="18" />
          </button>
        </div>
        <dl class="stats">
          <div v-for="item in stats" :key="item.label">
            <dt>{{ item.value }}</dt>
            <dd>{{ item.label }}</dd>
          </div>
        </dl>
      </div>

      <div class="hero-visual" aria-label="智答课堂 AI 课堂场景展示">
        <img :src="classroomImage" alt="教师手机扫码学生纸质答题卡的课堂场景" />
        <section class="screen-panel" aria-label="课堂大屏统计示意">
          <div>
            <strong>三角形内角和（选择题）</strong>
            <span>已提交 42/42</span>
          </div>
          <div class="result-grid">
            <div class="ring"><span>78%</span><small>正确率</small></div>
            <ul>
              <li><b>A</b><span style="--w: 88%"></span><em>33人</em></li>
              <li><b>B</b><span style="--w: 28%"></span><em>8人</em></li>
              <li><b>C</b><span style="--w: 10%"></span><em>2人</em></li>
            </ul>
          </div>
        </section>
        <section class="ai-panel" aria-label="AI 讲评建议示意">
          <div class="panel-title"><BrainCircuit :size="18" />AI 讲评与建议</div>
          <ul>
            <li v-for="item in aiFindings" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.percent }}</strong>
            </li>
          </ul>
          <p>建议用图示复盘关键概念，再安排 2-3 道同类变式练习。</p>
        </section>
      </div>
    </section>

    <section class="flow-section" id="flow">
      <div class="section-heading">
        <p>简单四步，完成课堂即时反馈闭环</p>
        <h2>常态课堂，低成本高效率</h2>
      </div>
      <div class="flow-grid">
        <article v-for="(step, index) in flowSteps" :key="step.title" class="flow-card">
          <span class="step-no">0{{ index + 1 }}</span>
          <component :is="step.icon" :size="28" />
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </article>
      </div>
    </section>

    <section class="capability-section" id="capabilities">
      <div class="section-heading left">
        <p>从课堂互动到学情诊断</p>
        <h2>不是另一个工具，而是一条教师可持续使用的教学闭环</h2>
      </div>
      <div class="capability-grid">
        <article v-for="item in capabilities" :key="item.title">
          <component :is="item.icon" :size="26" />
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="security-section" id="security">
      <div>
        <LockKeyhole :size="32" />
        <h2>为中国课堂设计的数据边界</h2>
      </div>
      <p>
        智答课堂 AI 默认不采集学生人脸、声音、精确位置或课堂视频原始数据。
        系统只传输纸卡解码后的卡号、选项和教学所需统计，让 AI 服务讲评，而不是制造额外风险。
      </p>
      <div class="security-points">
        <span><Smartphone :size="18" />教师手机扫码</span>
        <span><FileText :size="18" />纸质答题卡</span>
        <span><LineChart :size="18" />学情趋势沉淀</span>
      </div>
    </section>
  </main>
</template>
