'use client';

import { useState } from 'react';
import { UploadCloud } from 'lucide-react';

const FoodForm = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      alert("画像がアップロードされました。AI分析を開始します。（シミュレーション）");
    }, 2000);
  };

  return (
    <div className="bg-pms-bg-light p-6 rounded-2xl">
      <h2 className="text-xl font-bold text-pms-text-primary mb-6">AI 食事分析</h2>
      
      {!analysisResult && (
        <div className="text-center">
          <input
            type="file"
            id="imageUpload"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <label 
            htmlFor="imageUpload"
            className="cursor-pointer flex flex-col items-center justify-center p-10 border-2 border-dashed border-pms-border rounded-xl hover:border-pms-accent-cyan hover:bg-pms-bg-dark transition-colors duration-300"
          >
            <UploadCloud className="w-10 h-10 text-pms-text-secondary mb-4" />
            <span className="text-pms-text-primary font-semibold">クリックして画像をアップロード</span>
            <span className="text-sm text-pms-text-secondary mt-1">またはドラッグ＆ドロップ</span>
          </label>
          {isAnalyzing && <p className="text-pms-accent-cyan mt-4 animate-pulse">分析中...</p>}
        </div>
      )}

      {/* Analysis results will be rendered here later */}

    </div>
  );
};

export default FoodForm;
