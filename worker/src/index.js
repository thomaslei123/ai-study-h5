/* Cloudflare Worker —— AI 课辅后端代理（持密钥、转发给 GLM/DeepSeek）。
 * 网页前端公开，密钥绝不进前端：密钥用 `wrangler secret put` 存在 CF（见 README）。
 * 路由：
 *   POST /analyze  拍照判题（GLM 视觉，关思考）-> {questions, summary}
 *   POST /chat     对话答疑（带图走 GLM 视觉 / 纯文字走 DeepSeek）-> {reply}
 * 逻辑移植自原微信云函数 aiAnalyze / aiChat（含「关思考」加速、判题/辅导提示词）。
 */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/analyze') return cors(await analyze(request, env));
      if (request.method === 'POST' && url.pathname === '/chat') return cors(await chat(request, env));
    } catch (e) {
      return cors(json({ error: String(e && e.message || e) }, 500));
    }
    return cors(new Response('AI 课辅代理运行中。POST /analyze 或 /chat。', { status: 200 }));
  }
};

/* ---------- CORS ---------- */
function cors(resp) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(resp.body, { status: resp.status, headers: h });
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
}

/* ---------- 配置（CF 环境变量 / secrets，缺省给默认） ---------- */
function conf(env) {
  return {
    glmBase: (env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, ''),
    glmKey: env.GLM_API_KEY || '',
    glmModel: env.GLM_MODEL || 'glm-4.6v',
    dsBase: (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, ''),
    dsKey: env.DEEPSEEK_API_KEY || '',
    dsModel: env.DEEPSEEK_MODEL || 'deepseek-chat'
  };
}

/* 把前端来的图片（dataURL 对象/字符串）归一成纯 base64（智谱要纯 base64，不带 data: 前缀）。 */
function toBase64List(images) {
  return (images || []).map(function (im) {
    var s = typeof im === 'string' ? im : (im && im.dataURL) || '';
    var i = s.indexOf('base64,');
    return i >= 0 ? s.slice(i + 7) : s;
  }).filter(Boolean).slice(0, 6);
}

/* ---------- /analyze 判题 ---------- */
async function analyze(request, env) {
  const c = conf(env);
  if (!c.glmKey) return json({ error: '后端未配置 GLM_API_KEY' }, 500);
  const body = await request.json();
  const grade = gradeName(body.grade);
  const subjectName = body.subjectName || '';
  const textbook = body.textbook || '人教版';
  const images = toBase64List(body.images);
  if (!images.length) return json({ error: '未收到图片' }, 400);

  const sys = analyzeSystemPrompt(grade, subjectName, textbook);
  const userText = analyzeUserText(body.knowledgePoints || [], body.question || '');
  const content = [{ type: 'text', text: userText }];
  images.forEach(function (b64) { content.push({ type: 'image_url', image_url: { url: b64 } }); });

  const data = await callGLM(c, [
    { role: 'system', content: sys },
    { role: 'user', content: content }
  ], 0.2);
  const text = pick(data);
  const parsed = parseJSON(text);
  if (!parsed.questions || !parsed.questions.length) {
    return json({ error: '模型未返回有效题目', raw: String(text).slice(0, 500) }, 502);
  }
  return json(parsed);
}

function analyzeSystemPrompt(grade, subjectName, textbook) {
  return [
    '你是初中' + textbook + subjectName + '作业批改助手，面向' + grade + '学生。',
    '请完成：',
    '1. 识别图片中的【每一道】题目、学生作答与批改痕迹，从头到尾不要遗漏任何一题，也不要把多道题合并成一题。',
    '2. 每道题的 knowledgePoint 选最贴近的学科知识点，不要自创无关知识点。',
    '3. status 取值：correct(正确) / wrong(错误) / warning(疑似存疑或未作答)。',
    '4. 【严禁臆造】studentAnswer 必须严格按图中学生真实笔迹识别：该题学生空着、没作答就写"未作答"并把 status 设为 warning，绝对不要替学生编造、猜测或把参考答案当成学生答案；字迹看不清就在 explanation 注明"字迹不清"。',
    '5. 只输出一个 JSON 对象，不要任何额外文字或 Markdown 代码块。',
    'JSON 结构：',
    '{"questions":[{"number":"第1题","status":"wrong","title":"题干","studentAnswer":"学生答案","correctAnswer":"参考答案","knowledgePoint":"知识点","errorType":"错因","explanation":"解析","similarQuestions":["同类题1","同类题2"]}],"summary":{"suggestion":"一句话总结建议","mainWeakPoints":["薄弱点1"],"actionItems":["行动1","行动2"]}}'
  ].join('\n');
}

function analyzeUserText(knowledgePoints, question) {
  const kp = knowledgePoints.length
    ? knowledgePoints.map(function (p) { return typeof p === 'string' ? p : p.path; }).join('\n')
    : '（未提供，请按学科常规知识点归类）';
  const q = question ? ('\n【学生补充说明】\n' + question + '\n') : '';
  return ['【知识点清单（knowledgePoint 尽量从这里选）】', kp, q, '请批改图片中的作业，按系统要求输出 JSON。'].join('\n');
}

/* ---------- /chat 答疑 ---------- */
async function chat(request, env) {
  const c = conf(env);
  const body = await request.json();
  const grade = gradeName(body.grade);
  const subjectName = body.subjectName || '';
  let history = (Array.isArray(body.messages) ? body.messages : [])
    .filter(function (m) { return m && m.role && (m.content || (m.images && m.images.length)); })
    .slice(-16);
  if (!history.length) return json({ error: '没有提问内容' }, 400);

  // 历史里是否带图（只有最后一条带图时走视觉）
  const last = history[history.length - 1];
  const lastImages = toBase64List(last && last.images);

  let reply;
  if (lastImages.length) {
    if (!c.glmKey) return json({ error: '后端未配置 GLM_API_KEY' }, 500);
    const messages = [{ role: 'system', content: tutorSystem(grade, subjectName) }];
    history.forEach(function (m, i) {
      if (i === history.length - 1) {
        const content = [{ type: 'text', text: m.content || '请看图，帮我讲讲这道题。' }];
        lastImages.forEach(function (b64) { content.push({ type: 'image_url', image_url: { url: b64 } }); });
        messages.push({ role: 'user', content: content });
      } else {
        messages.push({ role: m.role, content: String(m.content || '') });
      }
    });
    reply = pick(await callGLM(c, messages, 0.4));
  } else {
    if (!c.dsKey) return json({ error: '后端未配置 DEEPSEEK_API_KEY' }, 500);
    const messages = [{ role: 'system', content: tutorSystem(grade, subjectName) }]
      .concat(history.map(function (m) { return { role: m.role, content: String(m.content || '') }; }));
    reply = pick(await callDeepSeek(c, messages));
  }
  if (!reply) return json({ error: '模型未返回内容' }, 502);
  return json({ reply: reply });
}

function tutorSystem(grade, subjectName) {
  return [
    '你是一位耐心、亲切的初中' + (subjectName || '') + '辅导老师，面向广东中山一名' + grade + '学生（人教/统编版教材）。',
    '学生可能会拍作业/题目照片并提问。请：',
    '1. 先看懂图（如有），结合学生的问题回答；看不清就说明，不要乱猜。',
    '2. 用初中生听得懂的话，按步骤讲清思路，不只给答案；理科给关键步骤，文科点考点与方法。',
    '3. 适当鼓励，篇幅适中，重点突出。',
    '4. 用纯文本回答，可简单分点，不要输出大段 Markdown 表格或代码块。'
  ].join('\n');
}

/* ---------- 模型调用 ---------- */
async function callGLM(c, messages, temperature) {
  const payload = { model: c.glmModel, temperature: temperature, max_tokens: 8192, messages: messages };
  if (/bigmodel\.cn/i.test(c.glmBase)) payload.thinking = { type: 'disabled' }; // 关思考：34s→10s 且吐干净 JSON
  return postJSON(c.glmBase + '/chat/completions', c.glmKey, payload);
}
async function callDeepSeek(c, messages) {
  return postJSON(c.dsBase + '/chat/completions', c.dsKey, { model: c.dsModel, temperature: 0.6, messages: messages });
}
async function postJSON(url, key, payload) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(payload)
  });
  const raw = await resp.text();
  if (!resp.ok) throw new Error('模型接口 ' + resp.status + '：' + raw.slice(0, 300));
  try { return JSON.parse(raw); } catch (e) { throw new Error('模型返回非 JSON：' + raw.slice(0, 300)); }
}
function pick(data) {
  return data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
}

/* ---------- 工具 ---------- */
function gradeName(g) {
  if (g === 'g7' || g === '七年级') return '七年级';
  if (g === 'g8' || g === '八年级') return '八年级';
  return g || '七年级';
}
function parseJSON(text) {
  if (!text) return {};
  let s = String(text).trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) { return {}; }
}
