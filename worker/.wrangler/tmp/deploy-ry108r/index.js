var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var index_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/analyze") return cors(await analyze(request, env));
      if (request.method === "POST" && url.pathname === "/chat") return cors(await chat(request, env));
    } catch (e) {
      return cors(json({ error: String(e && e.message || e) }, 500));
    }
    return cors(new Response("AI \u8BFE\u8F85\u4EE3\u7406\u8FD0\u884C\u4E2D\u3002POST /analyze \u6216 /chat\u3002", { status: 200 }));
  }
};
function cors(resp) {
  const h = new Headers(resp.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(resp.body, { status: resp.status, headers: h });
}
__name(cors, "cors");
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } });
}
__name(json, "json");
function conf(env) {
  return {
    glmBase: (env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, ""),
    glmKey: env.GLM_API_KEY || "",
    glmModel: env.GLM_MODEL || "glm-4.6v",
    dsBase: (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
    dsKey: env.DEEPSEEK_API_KEY || "",
    dsModel: env.DEEPSEEK_MODEL || "deepseek-chat"
  };
}
__name(conf, "conf");
function toBase64List(images) {
  return (images || []).map(function(im) {
    var s = typeof im === "string" ? im : im && im.dataURL || "";
    var i = s.indexOf("base64,");
    return i >= 0 ? s.slice(i + 7) : s;
  }).filter(Boolean).slice(0, 6);
}
__name(toBase64List, "toBase64List");
async function analyze(request, env) {
  const c = conf(env);
  if (!c.glmKey) return json({ error: "\u540E\u7AEF\u672A\u914D\u7F6E GLM_API_KEY" }, 500);
  const body = await request.json();
  const grade = gradeName(body.grade);
  const subjectName = body.subjectName || "";
  const textbook = body.textbook || "\u4EBA\u6559\u7248";
  const images = toBase64List(body.images);
  if (!images.length) return json({ error: "\u672A\u6536\u5230\u56FE\u7247" }, 400);
  const sys = analyzeSystemPrompt(grade, subjectName, textbook);
  const userText = analyzeUserText(body.knowledgePoints || [], body.question || "");
  const content = [{ type: "text", text: userText }];
  images.forEach(function(b64) {
    content.push({ type: "image_url", image_url: { url: b64 } });
  });
  const data = await callGLM(c, [
    { role: "system", content: sys },
    { role: "user", content }
  ], 0.2);
  const text = pick(data);
  const parsed = parseJSON(text);
  if (!parsed.questions || !parsed.questions.length) {
    return json({ error: "\u6A21\u578B\u672A\u8FD4\u56DE\u6709\u6548\u9898\u76EE", raw: String(text).slice(0, 500) }, 502);
  }
  return json(parsed);
}
__name(analyze, "analyze");
function analyzeSystemPrompt(grade, subjectName, textbook) {
  return [
    "\u4F60\u662F\u521D\u4E2D" + textbook + subjectName + "\u4F5C\u4E1A\u6279\u6539\u52A9\u624B\uFF0C\u9762\u5411" + grade + "\u5B66\u751F\u3002",
    "\u8BF7\u5B8C\u6210\uFF1A",
    "1. \u8BC6\u522B\u56FE\u7247\u4E2D\u7684\u3010\u6BCF\u4E00\u9053\u3011\u9898\u76EE\u3001\u5B66\u751F\u4F5C\u7B54\u4E0E\u6279\u6539\u75D5\u8FF9\uFF0C\u4ECE\u5934\u5230\u5C3E\u4E0D\u8981\u9057\u6F0F\u4EFB\u4F55\u4E00\u9898\uFF0C\u4E5F\u4E0D\u8981\u628A\u591A\u9053\u9898\u5408\u5E76\u6210\u4E00\u9898\u3002",
    "2. \u6BCF\u9053\u9898\u7684 knowledgePoint \u9009\u6700\u8D34\u8FD1\u7684\u5B66\u79D1\u77E5\u8BC6\u70B9\uFF0C\u4E0D\u8981\u81EA\u521B\u65E0\u5173\u77E5\u8BC6\u70B9\u3002",
    "3. status \u53D6\u503C\uFF1Acorrect(\u6B63\u786E) / wrong(\u9519\u8BEF) / warning(\u7591\u4F3C\u5B58\u7591\u6216\u672A\u4F5C\u7B54)\u3002",
    '4. \u3010\u4E25\u7981\u81C6\u9020\u3011studentAnswer \u5FC5\u987B\u4E25\u683C\u6309\u56FE\u4E2D\u5B66\u751F\u771F\u5B9E\u7B14\u8FF9\u8BC6\u522B\uFF1A\u8BE5\u9898\u5B66\u751F\u7A7A\u7740\u3001\u6CA1\u4F5C\u7B54\u5C31\u5199"\u672A\u4F5C\u7B54"\u5E76\u628A status \u8BBE\u4E3A warning\uFF0C\u7EDD\u5BF9\u4E0D\u8981\u66FF\u5B66\u751F\u7F16\u9020\u3001\u731C\u6D4B\u6216\u628A\u53C2\u8003\u7B54\u6848\u5F53\u6210\u5B66\u751F\u7B54\u6848\uFF1B\u5B57\u8FF9\u770B\u4E0D\u6E05\u5C31\u5728 explanation \u6CE8\u660E"\u5B57\u8FF9\u4E0D\u6E05"\u3002',
    "5. \u53EA\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981\u4EFB\u4F55\u989D\u5916\u6587\u5B57\u6216 Markdown \u4EE3\u7801\u5757\u3002",
    "JSON \u7ED3\u6784\uFF1A",
    '{"questions":[{"number":"\u7B2C1\u9898","status":"wrong","title":"\u9898\u5E72","studentAnswer":"\u5B66\u751F\u7B54\u6848","correctAnswer":"\u53C2\u8003\u7B54\u6848","knowledgePoint":"\u77E5\u8BC6\u70B9","errorType":"\u9519\u56E0","explanation":"\u89E3\u6790","similarQuestions":["\u540C\u7C7B\u98981","\u540C\u7C7B\u98982"]}],"summary":{"suggestion":"\u4E00\u53E5\u8BDD\u603B\u7ED3\u5EFA\u8BAE","mainWeakPoints":["\u8584\u5F31\u70B91"],"actionItems":["\u884C\u52A81","\u884C\u52A82"]}}'
  ].join("\n");
}
__name(analyzeSystemPrompt, "analyzeSystemPrompt");
function analyzeUserText(knowledgePoints, question) {
  const kp = knowledgePoints.length ? knowledgePoints.map(function(p) {
    return typeof p === "string" ? p : p.path;
  }).join("\n") : "\uFF08\u672A\u63D0\u4F9B\uFF0C\u8BF7\u6309\u5B66\u79D1\u5E38\u89C4\u77E5\u8BC6\u70B9\u5F52\u7C7B\uFF09";
  const q = question ? "\n\u3010\u5B66\u751F\u8865\u5145\u8BF4\u660E\u3011\n" + question + "\n" : "";
  return ["\u3010\u77E5\u8BC6\u70B9\u6E05\u5355\uFF08knowledgePoint \u5C3D\u91CF\u4ECE\u8FD9\u91CC\u9009\uFF09\u3011", kp, q, "\u8BF7\u6279\u6539\u56FE\u7247\u4E2D\u7684\u4F5C\u4E1A\uFF0C\u6309\u7CFB\u7EDF\u8981\u6C42\u8F93\u51FA JSON\u3002"].join("\n");
}
__name(analyzeUserText, "analyzeUserText");
async function chat(request, env) {
  const c = conf(env);
  const body = await request.json();
  const grade = gradeName(body.grade);
  const subjectName = body.subjectName || "";
  let history = (Array.isArray(body.messages) ? body.messages : []).filter(function(m) {
    return m && m.role && (m.content || m.images && m.images.length);
  }).slice(-16);
  if (!history.length) return json({ error: "\u6CA1\u6709\u63D0\u95EE\u5185\u5BB9" }, 400);
  const last = history[history.length - 1];
  const lastImages = toBase64List(last && last.images);
  let reply;
  if (lastImages.length) {
    if (!c.glmKey) return json({ error: "\u540E\u7AEF\u672A\u914D\u7F6E GLM_API_KEY" }, 500);
    const messages = [{ role: "system", content: tutorSystem(grade, subjectName) }];
    history.forEach(function(m, i) {
      if (i === history.length - 1) {
        const content = [{ type: "text", text: m.content || "\u8BF7\u770B\u56FE\uFF0C\u5E2E\u6211\u8BB2\u8BB2\u8FD9\u9053\u9898\u3002" }];
        lastImages.forEach(function(b64) {
          content.push({ type: "image_url", image_url: { url: b64 } });
        });
        messages.push({ role: "user", content });
      } else {
        messages.push({ role: m.role, content: String(m.content || "") });
      }
    });
    reply = pick(await callGLM(c, messages, 0.4));
  } else {
    if (!c.dsKey) return json({ error: "\u540E\u7AEF\u672A\u914D\u7F6E DEEPSEEK_API_KEY" }, 500);
    const messages = [{ role: "system", content: tutorSystem(grade, subjectName) }].concat(history.map(function(m) {
      return { role: m.role, content: String(m.content || "") };
    }));
    reply = pick(await callDeepSeek(c, messages));
  }
  if (!reply) return json({ error: "\u6A21\u578B\u672A\u8FD4\u56DE\u5185\u5BB9" }, 502);
  return json({ reply });
}
__name(chat, "chat");
function tutorSystem(grade, subjectName) {
  return [
    "\u4F60\u662F\u4E00\u4F4D\u8010\u5FC3\u3001\u4EB2\u5207\u7684\u521D\u4E2D" + (subjectName || "") + "\u8F85\u5BFC\u8001\u5E08\uFF0C\u9762\u5411\u5E7F\u4E1C\u4E2D\u5C71\u4E00\u540D" + grade + "\u5B66\u751F\uFF08\u4EBA\u6559/\u7EDF\u7F16\u7248\u6559\u6750\uFF09\u3002",
    "\u5B66\u751F\u53EF\u80FD\u4F1A\u62CD\u4F5C\u4E1A/\u9898\u76EE\u7167\u7247\u5E76\u63D0\u95EE\u3002\u8BF7\uFF1A",
    "1. \u5148\u770B\u61C2\u56FE\uFF08\u5982\u6709\uFF09\uFF0C\u7ED3\u5408\u5B66\u751F\u7684\u95EE\u9898\u56DE\u7B54\uFF1B\u770B\u4E0D\u6E05\u5C31\u8BF4\u660E\uFF0C\u4E0D\u8981\u4E71\u731C\u3002",
    "2. \u7528\u521D\u4E2D\u751F\u542C\u5F97\u61C2\u7684\u8BDD\uFF0C\u6309\u6B65\u9AA4\u8BB2\u6E05\u601D\u8DEF\uFF0C\u4E0D\u53EA\u7ED9\u7B54\u6848\uFF1B\u7406\u79D1\u7ED9\u5173\u952E\u6B65\u9AA4\uFF0C\u6587\u79D1\u70B9\u8003\u70B9\u4E0E\u65B9\u6CD5\u3002",
    "3. \u9002\u5F53\u9F13\u52B1\uFF0C\u7BC7\u5E45\u9002\u4E2D\uFF0C\u91CD\u70B9\u7A81\u51FA\u3002",
    "4. \u7528\u7EAF\u6587\u672C\u56DE\u7B54\uFF0C\u53EF\u7B80\u5355\u5206\u70B9\uFF0C\u4E0D\u8981\u8F93\u51FA\u5927\u6BB5 Markdown \u8868\u683C\u6216\u4EE3\u7801\u5757\u3002"
  ].join("\n");
}
__name(tutorSystem, "tutorSystem");
async function callGLM(c, messages, temperature) {
  const payload = { model: c.glmModel, temperature, max_tokens: 8192, messages };
  if (/bigmodel\.cn/i.test(c.glmBase)) payload.thinking = { type: "disabled" };
  return postJSON(c.glmBase + "/chat/completions", c.glmKey, payload);
}
__name(callGLM, "callGLM");
async function callDeepSeek(c, messages) {
  return postJSON(c.dsBase + "/chat/completions", c.dsKey, { model: c.dsModel, temperature: 0.6, messages });
}
__name(callDeepSeek, "callDeepSeek");
async function postJSON(url, key, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(payload)
  });
  const raw = await resp.text();
  if (!resp.ok) throw new Error("\u6A21\u578B\u63A5\u53E3 " + resp.status + "\uFF1A" + raw.slice(0, 300));
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error("\u6A21\u578B\u8FD4\u56DE\u975E JSON\uFF1A" + raw.slice(0, 300));
  }
}
__name(postJSON, "postJSON");
function pick(data) {
  return data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
}
__name(pick, "pick");
function gradeName(g) {
  if (g === "g7" || g === "\u4E03\u5E74\u7EA7") return "\u4E03\u5E74\u7EA7";
  if (g === "g8" || g === "\u516B\u5E74\u7EA7") return "\u516B\u5E74\u7EA7";
  return g || "\u4E03\u5E74\u7EA7";
}
__name(gradeName, "gradeName");
function parseJSON(text) {
  if (!text) return {};
  let s = String(text).trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    return JSON.parse(s);
  } catch (e) {
    return {};
  }
}
__name(parseJSON, "parseJSON");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
