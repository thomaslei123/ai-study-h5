# AI 课辅后端代理（Cloudflare Worker）

网页前端是公开的，**密钥绝不能写进网页**。这个 Worker 替网页持密钥、转发给智谱 GLM（拍照判题/看图答疑）和 DeepSeek（纯文字答疑）。免费额度 10 万次/天，对个人自用绰绰有余。

## 一次性部署步骤（拿到永久后端网址）

### 1. 注册 Cloudflare 账号
打开 https://dash.cloudflare.com/sign-up 用邮箱注册（免费，不用绑卡）。

### 2. 在本机登录 wrangler（CF 官方 CLI）
```bash
cd "/mnt/d/2 training/AI 培训/AI 课辅初中/ai-study-h5/worker"
npx --yes wrangler login        # 会弹浏览器授权，点 Allow
```
> WSL 弹不出浏览器时，把命令打印的链接复制到 Windows 浏览器打开授权即可。

### 3. 把两个密钥存进 Cloudflare（不进代码、不进 git）
密钥在 `D:\2 training\AI 培训\openclaw\`（deepseek key.txt、智谱KEY .txt 第 1 个）。
```bash
npx wrangler secret put GLM_API_KEY        # 粘贴智谱 key（id.secret 原样），回车
npx wrangler secret put DEEPSEEK_API_KEY   # 粘贴 DeepSeek key，回车
```

### 4. 部署
```bash
npx wrangler deploy
```
部署成功会打印后端网址，形如 `https://ai-kefu-proxy.<你的子域>.workers.dev`。

### 5. 把网址填进网页
打开 https://thomaslei123.github.io/ai-study-h5/ → 「我的 → AI 后端地址」→ 粘贴上面的网址 → 保存。
之后拍照判题/答疑就是真实 AI（GLM-4.6V + DeepSeek）。

## 改完代码重新部署
```bash
npx wrangler deploy
```

## 接口
- `POST /analyze`  body `{grade,subjectId,subjectName,textbook,images:[dataURL],question}` → `{questions,summary}`
- `POST /chat`     body `{grade,subjectName,messages:[{role,content,images?}]}` → `{reply}`
