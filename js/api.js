/* AI 接口层（网页版）。两种模式：
 *   "mock" - 本地模拟，无需后端，离线可用（默认，先把 UI 跑通）
 *   "http" - POST 到后端代理（密钥在后端，绝不进前端）。后端地址在「我的」里配置 backendUrl。
 * 后端约定（待 #4 讨论确定方案后实现）：
 *   POST {backendUrl}/analyze  body:{grade,subjectId,subjectName,textbook,images:[dataURL...],question}
 *        -> { questions:[{number,status,title,studentAnswer,correctAnswer,knowledgePoint,errorType,explanation,similarQuestions[]}], summary:{suggestion,mainWeakPoints[],actionItems[]} }
 *   POST {backendUrl}/chat     body:{grade,messages:[{role,content,images?}]} -> { reply }
 */
(function () {
  function mode() {
    return Store.getSettings().backendUrl ? 'http' : 'mock';
  }

  /* ---------- 判题 ---------- */
  function analyzeHomework(payload) {
    if (mode() === 'http') {
      return analyzeViaHttp(payload).catch(function (err) {
        console.error('[ai] 后端判题失败，回退示例：', err);
        return analyzeViaMock(payload);
      });
    }
    return analyzeViaMock(payload);
  }

  function analyzeViaHttp(payload) {
    var base = Store.getSettings().backendUrl.replace(/\/$/, '');
    return fetch(base + '/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: payload.grade,
        images: payload.images || [],
        question: payload.question || '',
        model: Store.getSettings().model || 'claude'
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (raw) {
      return normalizeAnalysis(raw, payload);
    });
  }

  function analyzeViaMock(payload) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(normalizeAnalysis(mockRaw(payload), payload));
      }, 700);
    });
  }

  function mockRaw(payload) {
    var subj = Data.getSubject(payload.subjectId).name;
    return {
      questions: [
        { number: '第1题', status: 'correct', title: '【示例·' + subj + '】基础题', studentAnswer: '（学生作答）', correctAnswer: '正确', explanation: '思路正确，步骤完整。' },
        { number: '第2题', status: 'wrong', title: '【示例】综合应用题', studentAnswer: '（写错的答案）', correctAnswer: '参考答案', knowledgePoint: '本题考点', errorType: '概念混淆', explanation: '错在第二步，应先……。这是 mock 占位，接入后端后为真实解析。', similarQuestions: ['同类练习一', '同类练习二'] },
        { number: '第3题', status: 'warning', title: '【示例】未作答', studentAnswer: '', correctAnswer: '参考答案', explanation: '此题空着，未作答。' }
      ],
      summary: {
        suggestion: '这是本地示例数据。在「我的 → 后端地址」填入 AI 代理地址后，即为真实判题。',
        mainWeakPoints: ['示例薄弱点'],
        actionItems: ['配置后端地址', '重新拍题试试']
      }
    };
  }

  function normalizeStatus(s) {
    if (s === 'wrong' || s === 'warning' || s === 'correct') return s;
    if (s === '错误' || s === '错') return 'wrong';
    if (s === '疑似' || s === '存疑' || s === '未作答') return 'warning';
    return 'correct';
  }

  function normalizeAnalysis(raw, payload) {
    // 科目由 AI 自动识别（raw.subject 中文名）；识别不到回落 payload 或综合
    var subjectId = raw.subject ? Data.subjectIdByName(raw.subject) : (payload.subjectId || 'other');
    var subject = Data.getSubject(subjectId);
    var images = payload.images || [];
    var questions = (raw.questions || []).map(function (q, i) {
      return {
        id: Store.uid('q'),
        number: q.number || ('第' + (i + 1) + '题'),
        status: normalizeStatus(q.status),
        title: q.title || '',
        studentAnswer: q.studentAnswer || '',
        correctAnswer: q.correctAnswer || '',
        knowledgePoint: q.knowledgePoint || '',
        errorType: q.errorType || '',
        explanation: q.explanation || '',
        similarQuestions: q.similarQuestions || []
      };
    });
    var wrong = questions.filter(function (q) { return q.status === 'wrong'; }).length;
    var warning = questions.filter(function (q) { return q.status === 'warning'; }).length;
    var total = questions.length || 1;
    var summary = raw.summary || {};
    return {
      id: Store.uid('analysis'),
      createdAt: Date.now(),
      grade: payload.grade,
      subjectId: subjectId,
      subjectName: subject.name,
      textbook: subject.textbook,
      images: images,
      questions: questions,
      summary: {
        total: questions.length,
        wrong: wrong,
        warning: warning,
        scoreRate: Math.round(((total - wrong - warning * 0.5) / total) * 100),
        mainWeakPoints: summary.mainWeakPoints || [],
        suggestion: summary.suggestion || '',
        actionItems: summary.actionItems || []
      }
    };
  }

  /* ---------- 对话答疑 ----------
   * messages: [{role,content,images?}]，最后一条 user 可带 images（dataURL 数组）→ 走 GLM 视觉。 */
  function chat(messages, grade, subjectName) {
    if (mode() === 'http') {
      var base = Store.getSettings().backendUrl.replace(/\/$/, '');
      return fetch(base + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: grade, subjectName: subjectName || '', messages: messages, model: Store.getSettings().model || 'claude' })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (d) { return d.reply || ''; });
    }
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve('（示例回答）这是本地 mock。在「我的 → AI 后端地址」填入代理地址后，即为真实 AI 老师答疑。');
      }, 500);
    });
  }

  window.Api = { analyzeHomework: analyzeHomework, chat: chat, mode: mode };
})();
