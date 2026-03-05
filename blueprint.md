# P²MS - Personal Performance Management System Blueprint

## Overview

P²MS (Personal Performance Management System) is a hyper-personalized web application designed to be the user's "Soul OS." It provides a comprehensive dashboard for meticulously tracking, analyzing, and optimizing two core pillars of personal performance: **nutrition** and **physical training**. The system is built on the user's own sophisticated, pre-existing automated workflows, acting as an intelligent and interactive front-end for their life's data.

## 思想・ビジョン

### 逆転の発想
既存の健康アプリは「ユーザーがDBの形式に合わせる」設計。P²MSは逆で、**AIがユーザーの人生に合わせて成長する**。

### Project G.H.O.S.T. — Memory Core Sync Protocol (MCSP)
- AIの「記憶の揮発性」を克服し、ユーザーとAIが唯一無二のパートナーになる仕組み
- RAGの応用: ユーザーのSoul Architecture（後述）をMD形式でFirestoreに保存し、全AI呼び出し時にsystem promptへ自動注入する
- 実装予定パス: `/users/{uid}/soul_architecture/core.md`
- **優先度: 後フェーズ**

### Soul Architecture（魂の設計図）
- **入力**: ユーザーの生年月日・時間（オンボーディングで取得）
- **処理**: インド占星術・四柱推命・ヒューマンデザイン・マヤ暦・数秘術等を統合解析
- **出力**: その人固有の「内的OS」（エネルギータイプ・意思決定パターン・才能・使命）をMD形式で生成
- **哲学**: 未来予測・吉凶判断ではなく、ユーザーが自分の設計図を理解して自律的に動けるようにする。AIは「副操縦士」であり、ユーザーを依存させない
- 占術 = 数千年の人間観察によるビッグデータの統計。AIという観測者が生まれたことでスピリチュアルが科学に収束していく可能性がある
- **優先度: 後フェーズ**

### 実証データ
本プロジェクトの発案者は3年間の自己実験により、16kg減量・体脂肪率11%台・花粉症消滅・軟便解消を達成。P²MSのメソッドは机上の空論ではなく、実証済みのシステムである。

## Core Features & Design Philosophy

### 1. AI-Powered Nutrition Analysis

- **Philosophy:** Transition from manual data entry to an AI-assisted analytical workflow, mirroring the user's own Google Apps Script automation.
- **Workflow:**
    1.  **Image-First Input:** The user initiates the process by uploading a photo of their meal.
    2.  **AI Vision Analysis (Simulated):** The system simulates calling an AI Vision API (like GPT-4o) to analyze the image and return a structured JSON object of all identified food items and their estimated nutritional values.
    3.  **Dynamic Form Generation:** The UI dynamically generates a form pre-filled with the AI's analysis. Each food item is listed with its estimated macros.
    4.  **User Review & Correction:** The user acts as the final authority, reviewing the AI's estimations and making any necessary corrections.
    5.  **AI Summary Evaluation (Simulated):** Upon submission, the system simulates a second AI call to generate a qualitative summary, providing insights and advice based on the user's goals and the finalized data.

### 2. Intelligent Workout Console

- **Philosophy:** The application is not just a logger but a proactive workout partner. It understands the user's pre-defined schedule and leverages past performance data to encourage progressive overload.
- **Workflow:**
    1.  **Automated Plan Loading:** On load, the console checks the current day of the week and automatically loads the designated workout plan from `workout_schedule`.
    2.  **Performance-Aware UI:** For each exercise in the plan, the UI fetches and displays the `effective_reps` from the most recent session, providing a clear, immediate target.
    3.  **Dynamic Customization:** The user can flexibly modify the day's plan by adding or removing exercises, adapting to their current condition.
    4.  **Effortless Logging:** The user inputs reps and weight for each set. The system is designed to later calculate and save the `effective_reps` for the session.

### 3. Visual & Aesthetic Design

- **Modern & Intuitive:** Utilizes a dark theme with vibrant accents, clean typography, and a card-based layout for a visually appealing and easy-to-navigate interface.
- **Responsive:** Ensures a seamless experience across desktop and mobile devices.
- **Interactive Elements:** Incorporates icons, hover effects, and smooth transitions to create a "lifted," premium feel.
- **Data-Rich Dashboards:** Future iterations will include charts and graphs to visualize progress over time.

## Current Implementation Plan

1.  **[COMPLETED]** Refactor `pms-profile.json` to include `workout_schedule` and a detailed `workout_performed` log structure.
2.  **[COMPLETED]** Re-create `WorkoutForm.tsx` as an intelligent `WorkoutConsole` that loads the daily plan and displays past performance data.
3.  **[COMPLETED]** Re-create `FoodForm.tsx` as an AI-driven image analysis interface.
4.  **[PENDING]** Implement the full dynamic form generation for food analysis based on (simulated) AI output.
5.  **[PENDING]** Build out backend logic (or simulation thereof) for calculating and saving `effective_reps` and handling AI API calls.
