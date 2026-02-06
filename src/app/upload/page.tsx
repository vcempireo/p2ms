"use client";

import { useState } from "react";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function UploadPage() {
  const [status, setStatus] = useState("準備OK");
  const [healthCsv, setHealthCsv] = useState("");
  const [workoutCsv, setWorkoutCsv] = useState("");
  const [progress, setProgress] = useState(0);

  // === 🛠️ 強力なCSV読み取り機 ===
  // "10,000歩" のような引用符付きカンマを無視して正しく区切る関数
  const parseCSVLine = (line: string) => {
    // 正規表現マジック: 「引用符の中にあるカンマ」は無視して分割する
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    return line.split(regex).map(col => {
      // 前後の空白と、引用符（"）を取り除く
      return col.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
    });
  };

  const parseAndUpload = async () => {
    setStatus("データ解析を開始します...");
    setProgress(5);

    try {
      const logsMap: Record<string, any> = {};

      // === 1. HealthKitログの解析 ===
      const healthLines = healthCsv.trim().split("\n");
      let healthCount = 0;

      for (let i = 1; i < healthLines.length; i++) {
        const line = healthLines[i].trim();
        if (!line) continue;
        
        // 新しい読み取り機を使う
        const cols = parseCSVLine(line);
        if (cols.length < 10) continue;

        // 日付変換 (YYYY/MM/DD -> YYYY-MM-DD)
        const dateStr = cols[0].replace(/\//g, "-");
        
        // 数値の抽出 (0の場合は undefined にして、既存データを上書きしないようにする)
        const weight = parseFloat(cols[2]);
        const bodyFat = parseFloat(cols[4]);
        const steps = parseInt(cols[10]);

        if (!logsMap[dateStr]) logsMap[dateStr] = { date: dateStr };
        
        // データが存在する(0じゃない)場合のみセットするオブジェクトを作る
        const healthMetrics: any = {};
        if (weight > 0) healthMetrics.weight_kg = weight;
        if (bodyFat > 0) healthMetrics.body_fat_percent = bodyFat;
        if (cols[6] && parseFloat(cols[6]) > 0) healthMetrics.bmi = parseFloat(cols[6]);
        if (cols[8] && parseFloat(cols[8]) > 0) healthMetrics.lbm_kg = parseFloat(cols[8]);
        if (steps > 0) healthMetrics.steps = steps;

        // 空っぽじゃなければ登録
        if (Object.keys(healthMetrics).length > 0) {
           logsMap[dateStr].health_metrics = healthMetrics;
           healthCount++;
        }
      }

      // === 2. ワークアウトログの解析 ===
      const workoutLines = workoutCsv.trim().split("\n");
      let workoutCount = 0;

      for (let i = 1; i < workoutLines.length; i++) {
        const line = workoutLines[i].trim();
        if (!line) continue;
        
        const cols = parseCSVLine(line);
        if (cols.length < 5) continue;

        const dateStr = cols[0].replace(/\//g, "-");
        const menuCode = cols[3]; 
        const exerciseName = cols[4];

        // 「休み」や空行はスキップ
        if (!exerciseName || exerciseName === "休み") continue;

        // セット情報の抽出
        const sets = [];
        const setCols = [6, 9, 12, 15]; // CSVの列番号
        for (const colIdx of setCols) {
          if (cols[colIdx] && cols[colIdx] !== "-") {
            const val = parseFloat(cols[colIdx]);
            if (!isNaN(val)) {
              sets.push({ reps: val, weight_kg: null });
            }
          }
        }

        if (!logsMap[dateStr]) logsMap[dateStr] = { date: dateStr };
        
        if (!logsMap[dateStr].workout_performed) {
          logsMap[dateStr].workout_performed = {
            menu_ref_id: menuCode,
            menu_name: `Menu ${menuCode}`,
            exercises: []
          };
        }

        logsMap[dateStr].workout_performed.exercises.push({
          name: exerciseName,
          sets: sets,
          notes: cols[5] || "" // 目標やメモ
        });
        workoutCount++;
      }

      // === 3. Firestoreへ送信 ===
      const logs = Object.values(logsMap);
      setStatus(`解析完了: ヘルスケア${healthCount}件 / 筋トレ${workoutCount}件を検出。\nアップロード中...`);
      
      const chunkSize = 400; // 一度に送る数
      for (let i = 0; i < logs.length; i += chunkSize) {
        const chunk = logs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((log) => {
          const docRef = doc(db, "daily_logs", log.date);
          // { merge: true } で、既存の食事データなどを消さずに更新！
          batch.set(docRef, log, { merge: true });
        });

        await batch.commit();
        const currentProgress = Math.min(100, Math.round(((i + chunkSize) / logs.length) * 100));
        setProgress(currentProgress);
      }

      setStatus(`✅ 完了！${logs.length}日分のデータを完璧に同期しました！`);
      setProgress(100);

    } catch (e: any) {
      console.error(e);
      setStatus("❌ エラー: " + e.message);
    }
  };

  return (
    <div className="p-8 font-sans max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">📊 CSV データインポーター (改良版)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            1. HealthKitログ.csv
          </label>
          <textarea
            className="w-full h-64 p-3 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="ここに貼り付け..."
            value={healthCsv}
            onChange={(e) => setHealthCsv(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            2. 週間メニュー.csv
          </label>
          <textarea
            className="w-full h-64 p-3 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="ここに貼り付け..."
            value={workoutCsv}
            onChange={(e) => setWorkoutCsv(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
        <button 
          onClick={parseAndUpload}
          disabled={!healthCsv && !workoutCsv}
          className={`w-full md:w-1/2 py-4 px-6 rounded-lg font-bold text-lg text-white shadow-lg transition-all
            ${(!healthCsv && !workoutCsv) 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105'}`}
        >
          🚀 データを統合してアップロード
        </button>
        
        <div className="mt-6 w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        
        <p className="mt-4 font-bold text-gray-700 text-lg whitespace-pre-wrap">{status}</p>
      </div>
    </div>
  );
}