import React from 'react';
import { Film, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface HeaderProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  maxStepUnlocked: number;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onStepClick,
  maxStepUnlocked,
  onReset,
}) => {
  const steps = [
    { number: 1, title: 'Tải Video Lên', sub: 'Trích xuất khung hình' },
    { number: 2, title: 'Lọc Tên Diễn Viên', sub: 'Phân tích bởi Gemini' },
    { number: 3, title: 'Chọn Clip 5s', sub: 'Khớp video tương ứng' },
    { number: 4, title: 'Ghép & Xuất Video', sub: 'Render video hoàn chỉnh' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    AI Actor Video Stitcher
                  </h1>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Lọc tên diễn viên AI &bull; Tìm video 5 giây &bull; Ghép phim tự động
                </p>
              </div>
            </div>

            <button
              onClick={onReset}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Làm mới dự án"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {steps.map((s) => {
              const isActive = currentStep === s.number;
              const isPassed = currentStep > s.number;
              const isAccessible = s.number <= maxStepUnlocked;

              return (
                <button
                  key={s.number}
                  disabled={!isAccessible}
                  onClick={() => onStepClick(s.number)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : isPassed
                      ? 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
                      : isAccessible
                      ? 'text-slate-300 hover:bg-slate-800/50'
                      : 'text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isActive
                        ? 'bg-white text-rose-600'
                        : isPassed
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.number}
                  </span>
                  <div className="text-left hidden sm:block">
                    <span className="block leading-none">{s.title}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
              title="Khởi động lại dự án mới"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Dự án mới
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
