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
  const images = toBase64List(body.images);
  if (!images.length) return json({ error: '未收到图片' }, 400);

  const sys = analyzeSystemPrompt(grade);
  const userText = analyzeUserText(body.question || '');
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
  reconcile(parsed.questions); // 兜底：纯数字答案对不上却标对的，强制判错
  return json(parsed);
}

/* 数字类答案的确定性校正：correct 但学生答案≠正确答案（都为纯数值）时，纠正为 wrong。
   只处理纯数字，避免误伤文科/含单位/表达式的答案。 */
function reconcile(questions) {
  function num(s) {
    var m = String(s == null ? '' : s).replace(/\s|[，,。.；;]$/g, '').match(/^-?\d+(\.\d+)?$/);
    return m ? parseFloat(m[0]) : null;
  }
  questions.forEach(function (q) {
    var sa = String(q.studentAnswer || '');
    // 未作答 → 一律存疑(warning)，不当成错
    if (/未作答|未答|空白|没有作答|留空/.test(sa) || !sa.trim()) {
      q.status = 'warning';
      return;
    }
    if (q.status !== 'correct') return;
    var a = num(q.studentAnswer), b = num(q.correctAnswer);
    if (a !== null && b !== null && a !== b) {
      q.status = 'wrong';
      q.explanation = (q.explanation ? q.explanation + ' ' : '') + '（系统校正：学生答案 ' + q.studentAnswer + ' 与正确答案 ' + q.correctAnswer + ' 不一致）';
    }
  });
}

function analyzeSystemPrompt(grade) {
  return [
    '你是初中作业批改助手，面向广东中山一名' + grade + '学生（人教/统编版教材）。',
    '请完成：',
    '0. 【自动识别科目】先判断这份作业属于哪一科，只能在以下取一：语文/数学/英语/物理/生物/地理/历史/道法。把结果填到 JSON 顶层 subject 字段（用上面这些中文名）。',
    '1. 识别图片中的【每一道】题目、学生作答与批改痕迹，从头到尾不要遗漏任何一题，也不要把多道题合并成一题。',
    '2. 【认真辨认手写作答·重要】学生的作答常是手写的：圈选的字母、打勾、铅笔字、写在题号旁/横线上/答题区/页边的字或字母，都算"已作答"，要尽力辨认出来填进 studentAnswer。不要因为字迹潦草、颜色浅就当成没作答。只有该题确实完全空白时，studentAnswer 才填"未作答"。',
    '3. 【选择题处理】若是选择题，title 里要带上完整题干和各选项（如"…… A.xx B.xx C.xx D.xx"）；studentAnswer 填学生选的字母（看圈选/打勾/写的字母，如"B"）；correctAnswer 填你判断的正确选项字母。',
    '4. 【独立判题·最重要】对每一道题，你必须先【自己】从头解一遍、得出真正的正确答案 correctAnswer，再拿它和学生作答 studentAnswer 比对：',
    '   - 两者一致 → status=correct；不一致 → status=wrong（哪怕学生答案看起来合理也要判错）。',
    '   - 【严禁】把题面/学生写出的答案默认当成正确答案。算式（如 12-7=4）要亲自计算验证：12-7=5≠4，判 wrong，correctAnswer 填 5。',
    '   - explanation 里给出你的推理/计算过程和错在哪。',
    '5. 每道题的 knowledgePoint 填最贴近的该科知识点（如"有理数运算""古诗文默写""一般现在时"）。',
    '6. status 取值：correct(正确) / wrong(错误) / warning(疑似存疑)。【特别规定】studentAnswer 为"未作答"的题，status 必须填 warning（不是 wrong），表示待确认是否真没做。',
    '7. 【严禁臆造学生答案】不要替学生编造、猜测答案；字迹看不清就在 explanation 注明"字迹不清，请核对"，studentAnswer 填你能看清的部分或"字迹不清"。',
    '8. 【输出前自检·必须执行】逐题检查：studentAnswer 已作答且与 correctAnswer 不相等 → status 必须是 wrong；studentAnswer="未作答" → status 必须是 warning；不允许"答案不同却标 correct"的矛盾。',
    '9. 只输出一个 JSON 对象，不要任何额外文字或 Markdown 代码块。',
    'JSON 结构：',
    '{"subject":"语文","questions":[{"number":"第1题","status":"wrong","title":"题干","studentAnswer":"学生答案","correctAnswer":"参考答案","knowledgePoint":"知识点","errorType":"错因","explanation":"解析","similarQuestions":["同类题1","同类题2"]}],"summary":{"suggestion":"一句话总结建议","mainWeakPoints":["薄弱点1"],"actionItems":["行动1","行动2"]}}'
  ].join('\n');
}

function analyzeUserText(question) {
  const q = question ? ('\n【学生补充说明】\n' + question + '\n') : '';
  return ['请先识别科目，再批改图片中的作业，按系统要求输出 JSON。' + q].join('\n');
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
