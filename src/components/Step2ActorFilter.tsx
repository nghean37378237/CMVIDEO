import React, { useState } from 'react';
import {
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  Check,
  Clapperboard,
  Clock,
  Tag,
  Shuffle,
  Split,
} from 'lucide-react';
import { ActorItem, AIDetectionResult } from '../types';

interface Step2ActorFilterProps {
  detectionResult: AIDetectionResult;
  actors: ActorItem[];
  onActorsChange: (actors: ActorItem[]) => void;
  onProceed: () => void;
  onBack: () => void;
}

export const Step2ActorFilter: React.FC<Step2ActorFilterProps> = ({
  detectionResult,
  actors,
  onActorsChange,
  onProceed,
  onBack,
}) => {
  const [editingActorId, setEditingActorId] = useState<string | null>(null);

  // Update actor field
  const handleUpdateActor = (id: string, field: keyof ActorItem, value: any) => {
    const updated = actors.map((a) => (a.id === id ? { ...a, [field]: value } : a));
    onActorsChange(updated);
  };

  // Reorder actors
  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === actors.length - 1)
    ) {
      return;
    }
    const newActors = [...actors];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newActors[index];
    newActors[index] = newActors[targetIndex];
    newActors[targetIndex] = temp;
    onActorsChange(newActors);
  };

  // Random shuffle actors as requested by user
  const handleShuffle = () => {
    const shuffled = [...actors].sort(() => Math.random() - 0.5);
    onActorsChange(shuffled);
  };

  // Auto split original video time evenly (default 7.5s per actor)
  const handleAutoSplit = () => {
    const sliceDur = 7.5;
    const updated = actors.map((a, idx) => ({
      ...a,
      originalVideoStart: idx * sliceDur,
      originalVideoEnd: (idx + 1) * sliceDur,
    }));
    onActorsChange(updated);
  };

  // Populate complete 6 actors preset from Full House video
  const handlePopulate6FullHouse = () => {
    const full6: ActorItem[] = [
      {
        id: 'actor_ashley_olsen',
        name: 'Ashley Olsen',
        characterName: 'Michelle Tanner',
        famousMovie: 'Full House',
        seriesTitle: "' Full House '",
        bioSnippet: 'Ngôi sao nhí đáng yêu nhất thập niên 90.',
        searchKeywords: ['Ashley Olsen Mary-Kate red carpet ELLE'],
        visualStyle: 'Fashion Icon',
        tagColor: '#22c55e',
        originalVideoStart: 0,
        originalVideoEnd: 8,
        clipDuration: 5,
      },
      {
        id: 'actor_jodie_sweetin',
        name: 'Jodie Sweetin',
        characterName: 'Stephanie Tanner',
        famousMovie: 'Full House',
        seriesTitle: "' Full House '",
        bioSnippet: 'Cô bé Stephanie lém lỉnh với câu nói "How rude!".',
        searchKeywords: ['Jodie Sweetin interview podcast'],
        visualStyle: 'Sitcom Star',
        tagColor: '#22c55e',
        originalVideoStart: 8,
        originalVideoEnd: 16,
        clipDuration: 5,
      },
      {
        id: 'actor_candace_cameron',
        name: 'Candace Cameron Bure',
        characterName: 'D.J. Tanner',
        famousMovie: 'Full House',
        seriesTitle: "' Full House '",
        bioSnippet: 'Chị cả D.J. Tanner gương mẫu và lôi cuốn.',
        searchKeywords: ['Candace Cameron Bure lines on my face TikTok'],
        visualStyle: 'Social Media',
        tagColor: '#22c55e',
        originalVideoStart: 16,
        originalVideoEnd: 24,
        clipDuration: 5,
      },
      {
        id: 'actor_tahj_mowry',
        name: 'Tahj Mowry',
        characterName: 'Teddy',
        famousMovie: 'Full House / Smart Guy',
        seriesTitle: "' Full House '",
        bioSnippet: 'Cậu bạn thân Teddy lém lỉnh của Michelle.',
        searchKeywords: ['Tahj Mowry shirtless video Instagram'],
        visualStyle: 'Reel Video',
        tagColor: '#22c55e',
        originalVideoStart: 24,
        originalVideoEnd: 32,
        clipDuration: 5,
      },
      {
        id: 'actor_bob_saget',
        name: 'Bob Saget',
        characterName: 'Danny Tanner',
        famousMovie: 'Full House',
        seriesTitle: "' Full House '",
        bioSnippet: 'Người cha huyền thoại Danny Tanner của Full House.',
        searchKeywords: ['Bob Saget Here For You podcast Danny Burstein'],
        visualStyle: 'Podcast',
        tagColor: '#22c55e',
        originalVideoStart: 32,
        originalVideoEnd: 40,
        clipDuration: 5,
      },
      {
        id: 'actor_john_stamos',
        name: 'John Stamos',
        characterName: 'Uncle Jesse Katsopolis',
        famousMovie: 'Full House',
        seriesTitle: "' Full House '",
        bioSnippet: 'Người chú Jesse điển trai, phong trần.',
        searchKeywords: ['John Stamos stage interview memoir'],
        visualStyle: 'Talk Show',
        tagColor: '#22c55e',
        originalVideoStart: 40,
        originalVideoEnd: 48,
        clipDuration: 5,
      },
    ];
    onActorsChange(full6);
  };

  // Delete actor
  const handleDelete = (id: string) => {
    if (actors.length <= 1) {
      alert('Cần có ít nhất 1 diễn viên để ghép video.');
      return;
    }
    onActorsChange(actors.filter((a) => a.id !== id));
  };

  // Add new actor manually
  const handleAddActor = () => {
    const newActor: ActorItem = {
      id: `actor_custom_${Date.now()}`,
      name: `Diễn viên mới ${actors.length + 1}`,
      characterName: 'Nhân vật chính',
      famousMovie: 'Điện ảnh Hollywood',
      bioSnippet: 'Gương mặt mới do bạn bổ sung vào danh sách.',
      searchKeywords: ['action movie scene', 'cinematic actor clip'],
      visualStyle: 'Dramatic Cinema',
      tagColor: '#3b82f6',
      clipDuration: 5,
    };
    onActorsChange([...actors, newActor]);
    setEditingActorId(newActor.id);
  };

  const totalDuration = actors.reduce((acc, curr) => acc + (curr.clipDuration || 5), 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Overview from AI */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Bước 2: Lọc & Quản lý danh sách diễn viên AI
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {detectionResult.title || 'Danh sách diễn viên đã lọc từ video'}
            </h2>
            <p className="mt-1 text-slate-300 text-xs sm:text-sm max-w-3xl">
              {detectionResult.summary ||
                'Gemini AI đã phân tích khung hình video và trích xuất danh sách các diễn viên nổi bật.'}
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-right shrink-0">
            <span className="text-xs text-slate-400 block">Tổng thời lượng ghép</span>
            <span className="text-lg font-extrabold text-rose-400 flex items-center justify-end gap-1">
              <Clock className="w-4 h-4" />
              {totalDuration} giây
            </span>
            <span className="text-[11px] text-slate-500 block">
              ({actors.length} diễn viên &times; 5s)
            </span>
          </div>
        </div>
      </div>

      {/* Actor List Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-bold text-white">
            Danh sách diễn viên ({actors.length})
          </h3>
          <span className="text-xs text-slate-400 ml-1">
            (Có thể sửa tên, xóa, đổi thứ tự ghép)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-600 border border-amber-500/20 transition shadow"
            title="Đảo vị trí ngẫu nhiên thứ tự các diễn viên cắt từ video gốc"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Đảo vị trí ngẫu nhiên
          </button>

          <button
            onClick={handleAutoSplit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/20 transition"
            title="Tự động chia đều đoạn cắt từ video gốc (7.5s/người)"
          >
            <Split className="w-3.5 h-3.5" />
            Chia đều giây video gốc
          </button>

          {actors.length < 6 && (
            <button
              onClick={handlePopulate6FullHouse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/20 transition"
              title="Khôi phục danh sách đầy đủ 6 diễn viên"
            >
              <Users className="w-3.5 h-3.5" />
              Nạp đủ 6 diễn viên
            </button>
          )}

          <button
            onClick={handleAddActor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm diễn viên
          </button>
        </div>
      </div>

      {/* Actors Cards */}
      <div className="space-y-3.5">
        {actors.map((actor, idx) => {
          const isEditing = editingActorId === actor.id;

          return (
            <div
              key={actor.id}
              className={`rounded-2xl border transition p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isEditing
                  ? 'bg-slate-900 border-rose-500/70 shadow-lg'
                  : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Order badge & avatar */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">
                    #{idx + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition"
                      title="Chuyển lên trước"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === actors.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition"
                      title="Chuyển xuống sau"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Avatar Icon */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0"
                  style={{ backgroundColor: actor.tagColor || '#3b82f6' }}
                >
                  {actor.name ? actor.name.charAt(0).toUpperCase() : 'A'}
                </div>

                {/* Info Fields */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Tên diễn viên
                        </label>
                        <input
                          type="text"
                          value={actor.name}
                          onChange={(e) => handleUpdateActor(actor.id, 'name', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Vai diễn / Nhân vật
                        </label>
                        <input
                          type="text"
                          value={actor.characterName}
                          onChange={(e) =>
                            handleUpdateActor(actor.id, 'characterName', e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Phim / Series
                        </label>
                        <input
                          type="text"
                          value={actor.famousMovie}
                          onChange={(e) =>
                            handleUpdateActor(actor.id, 'famousMovie', e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-emerald-400 block mb-1">
                          Đoạn trong video AI gốc (giây bắt đầu &rarr; kết thúc)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Từ (s)"
                            value={actor.originalVideoStart ?? idx * 7}
                            onChange={(e) =>
                              handleUpdateActor(actor.id, 'originalVideoStart', parseFloat(e.target.value) || 0)
                            }
                            className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-slate-500 text-xs">&rarr;</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Đến (s)"
                            value={actor.originalVideoEnd ?? (idx + 1) * 7}
                            onChange={(e) =>
                              handleUpdateActor(actor.id, 'originalVideoEnd', parseFloat(e.target.value) || 7)
                            }
                            className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-white">{actor.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {actor.characterName}
                        </span>
                        <span className="text-xs text-rose-400 font-semibold flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          <Clapperboard className="w-3 h-3" />
                          {actor.famousMovie}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Đoạn AI gốc: {actor.originalVideoStart ?? idx * 7}s &rarr; {actor.originalVideoEnd ?? (idx + 1) * 7}s
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {actor.bioSnippet}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions & Duration */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span>{actor.clipDuration || 5}s</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingActorId(isEditing ? null : actor.id)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
                    title={isEditing ? 'Lưu chỉnh sửa' : 'Chỉnh sửa thông tin'}
                  >
                    {isEditing ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Edit2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(actor.id)}
                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-800/80 hover:bg-red-950/40 rounded-lg transition"
                    title="Xóa diễn viên khỏi danh sách ghép"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Step Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Bước 1
        </button>

        <button
          onClick={onProceed}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-lg shadow-rose-600/30 transition"
        >
          Tiếp tục: Tìm kiếm video 5s cho diễn viên
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
