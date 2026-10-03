/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { Step1Upload } from './components/Step1Upload';
import { Step2ActorFilter } from './components/Step2ActorFilter';
import { Step3ClipMatcher } from './components/Step3ClipMatcher';
import { Step4VideoStitcher } from './components/Step4VideoStitcher';
import { ActorItem, AIDetectionResult } from './types';

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxStepUnlocked, setMaxStepUnlocked] = useState<number>(1);
  const [detectionResult, setDetectionResult] = useState<AIDetectionResult | null>(null);
  const [actors, setActors] = useState<ActorItem[]>([]);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');

  // Handle Step 1 analysis complete
  const handleAnalysisComplete = (result: AIDetectionResult, videoSource?: string) => {
    setDetectionResult(result);
    setActors(result.actors || []);
    if (videoSource) {
      setUploadedVideoUrl(videoSource);
    }
    setMaxStepUnlocked((prev) => Math.max(prev, 2));
    setCurrentStep(2);
  };

  // Step 2 to Step 3
  const handleProceedToStep3 = () => {
    if (actors.length === 0) {
      alert('Danh sách diễn viên không được để trống.');
      return;
    }
    setMaxStepUnlocked((prev) => Math.max(prev, 3));
    setCurrentStep(3);
  };

  // Step 3 to Step 4
  const handleProceedToStep4 = () => {
    setMaxStepUnlocked((prev) => Math.max(prev, 4));
    setCurrentStep(4);
  };

  // Reset project
  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn làm mới và tạo dự án video khác?')) {
      setCurrentStep(1);
      setMaxStepUnlocked(1);
      setDetectionResult(null);
      setActors([]);
      setUploadedVideoUrl('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        currentStep={currentStep}
        onStepClick={(s) => setCurrentStep(s)}
        maxStepUnlocked={maxStepUnlocked}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 1 && (
          <Step1Upload onAnalysisComplete={handleAnalysisComplete} />
        )}

        {currentStep === 2 && detectionResult && (
          <Step2ActorFilter
            detectionResult={detectionResult}
            actors={actors}
            onActorsChange={setActors}
            onProceed={handleProceedToStep3}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3ClipMatcher
            actors={actors}
            onActorsChange={setActors}
            onProceed={handleProceedToStep4}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <Step4VideoStitcher
            actors={actors}
            originalVideoUrl={uploadedVideoUrl}
            onBack={() => setCurrentStep(3)}
            onRestart={handleReset}
            onActorsChange={setActors}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Actor Video Stitcher &bull; Phân tích & Ghép video 5 giây</span>
          <span className="text-slate-400">
            Hỗ trợ bởi Gemini 3.8 Flash & HTML5 Canvas MediaRecorder Engine
          </span>
        </div>
      </footer>
    </div>
  );
}
