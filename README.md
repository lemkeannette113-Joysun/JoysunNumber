# 数字叠叠乐：求和消除 (SumStack)

一款基于数学求和的消除类益智游戏。

## 核心玩法
- 点击方块使数字相加等于目标数字。
- 成功凑出目标数字后，选中的方块会被消除。
- 防止方块堆积到屏幕顶部。

## 部署到 Vercel 指南

### 1. 准备 GitHub 仓库
1. 在 GitHub 上创建一个新的仓库。
2. 在本地终端执行以下命令（假设你已经下载了代码）：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <你的仓库地址>
   git push -u origin main
   ```

### 2. 在 Vercel 上部署
1. 登录 [Vercel](https://vercel.com/)。
2. 点击 **Add New** -> **Project**。
3. 导入你刚刚创建的 GitHub 仓库。
4. **关键步骤：配置环境变量**
   - 在 **Environment Variables** 部分，添加 `GEMINI_API_KEY`。
   - 值为你从 Google AI Studio 获取的 API Key。
5. 点击 **Deploy**。

## 本地开发
```bash
npm install
npm run dev
```
