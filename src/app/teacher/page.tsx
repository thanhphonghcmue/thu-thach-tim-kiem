'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { User, Room, ClassRoom } from '@/types';
import { QUESTION_BANK } from '@/data/questions';
import {
  GraduationCap,
  Plus,
  Play,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal tạo phòng mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Thử thách Tìm kiếm - Tiết 2 Luyện tập');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [timeLimit, setTimeLimit] = useState(9);
  const [groupCount, setGroupCount] = useState(3);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([
    'mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'
  ]);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal tạo lớp mới
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('Lớp 11A2');
  const [studentNamesText, setStudentNamesText] = useState('Học sinh 1\nHọc sinh 2\nHọc sinh 3\nHọc sinh 4');

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (!saved) {
      router.push('/login?role=teacher');
      return;
    }

    try {
      const u = JSON.parse(saved);
      if (u.role !== 'teacher') {
        router.push('/login?role=teacher');
        return;
      }
      setUser(u);
      loadData(u.id);
    } catch (e) {
      router.push('/login?role=teacher');
    }
  }, []);

  const loadData = async (teacherId: string) => {
    try {
      setLoading(true);
      // Tải danh sách lớp
      const resClasses = await fetch(`/api/classes?teacherId=${teacherId}`);
      const dataClasses = await resClasses.json();
      if (dataClasses.classes) {
        setClasses(dataClasses.classes);
        if (dataClasses.classes.length > 0) {
          setSelectedClassId(dataClasses.classes[0].id);
        }
      }

      // Tải danh sách phòng
      const resRooms = await fetch(`/api/rooms?teacherId=${teacherId}`);
      const dataRooms = await resRooms.json();
      if (dataRooms.rooms) {
        setRooms(dataRooms.rooms);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClassId) return;

    if (selectedQuestionIds.length !== 5) {
      setCreateError('Theo quy định bài học, giáo viên phải chọn đúng 5 câu trắc nghiệm.');
      return;
    }

    setCreateError('');
    setCreating(true);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          classId: selectedClassId,
          name: newRoomName.trim(),
          selectedQuestionIds,
          timeLimitMinutes: timeLimit,
          groupCount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.room) {
        setCreateError(data.error || 'Lỗi tạo phòng thi');
        return;
      }

      setShowCreateModal(false);
      // Chuyển ngay tới trang giám sát phòng vừa tạo
      router.push(`/teacher/room/${data.room.code}`);
    } catch (err: any) {
      setCreateError(err.message || 'Lỗi kết nối');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newClassName.trim()) return;

    const names = studentNamesText.split('\n').map(n => n.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          name: newClassName.trim(),
          studentNames: names,
        }),
      });
      const data = await res.json();
      if (data.class) {
        setShowClassModal(false);
        loadData(user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleQuestionSelection = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      if (selectedQuestionIds.length <= 5) {
        // Cần giữ đủ 5 câu
        setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== qId));
      } else {
        setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== qId));
      }
    } else {
      if (selectedQuestionIds.length >= 5) {
        // Đổi câu: thay câu cuối cùng bằng câu mới
        const next = [...selectedQuestionIds.slice(0, 4), qId];
        setSelectedQuestionIds(next);
      } else {
        setSelectedQuestionIds([...selectedQuestionIds, qId]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header currentUser={user} onLogout={() => { localStorage.removeItem('app_user'); router.push('/login'); }} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-sky-600 block">
              Bảng điều khiển Giáo viên
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Quản lý Phòng học & Luyện tập
            </h1>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setShowClassModal(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-4 h-4 text-teal-600" />
              Tạo Lớp mới
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Mở Phòng thi mới
            </button>
          </div>
        </div>

        {/* Danh sách phòng đã tạo */}
        <div className="mb-10">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            Các phòng thử thách ({rooms.length})
          </h2>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Đang tải dữ liệu phòng...</div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              Chưa có phòng nào. Hãy nhấn "Mở Phòng thi mới" để tạo phòng luyện tập cho lớp!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map((room) => {
                const targetClass = classes.find(c => c.id === room.classId);

                let statusBadge = (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Phòng chờ
                  </span>
                );
                if (room.status === 'running') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                      ● Đang làm bài
                    </span>
                  );
                } else if (room.status === 'paused') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
                      Tạm dừng
                    </span>
                  );
                } else if (room.status === 'published') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                      Đã công bố kết quả
                    </span>
                  );
                } else if (room.status === 'closed') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Đã đóng
                    </span>
                  );
                }

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xl font-black font-mono tracking-widest text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                          {room.code}
                        </span>
                        {statusBadge}
                      </div>

                      <h3 className="font-bold text-slate-800 text-sm mb-1 leading-snug">
                        {room.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        Lớp: <strong>{targetClass?.name || 'Lớp 11'}</strong> • Thời lượng: {room.timeLimitMinutes} phút
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {new Date(room.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <button
                        onClick={() => router.push(`/teacher/room/${room.code}`)}
                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                      >
                        Vào giám sát
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Danh sách lớp và tài khoản học sinh */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            Danh sách lớp & Mã đăng nhập học sinh ({classes.length} lớp)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {classes.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h3 className="font-bold text-slate-800 text-sm">{c.name}</h3>
                  <span className="text-xs text-slate-500">
                    {c.students?.length || 0} học sinh
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {c.students?.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs border border-slate-100"
                    >
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">@{s.username}</span>
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                          {s.loginCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal tạo phòng mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Cấu hình & Tạo Phòng thi mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Chọn bộ đúng 5 trong 6 câu trắc nghiệm và thời lượng cho buổi học
            </p>

            {createError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên phòng:</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lớp áp dụng:</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thời lượng làm bài:</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value={9}>9 phút (Mặc định)</option>
                    <option value={15}>15 phút</option>
                    <option value={17}>17 phút (Cả tiết)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số nhóm chia:</label>
                  <select
                    value={groupCount}
                    onChange={(e) => setGroupCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                  >
                    <option value={3}>3 nhóm (3-4 em/nhóm)</option>
                    <option value={4}>4 nhóm</option>
                    <option value={2}>2 nhóm</option>
                  </select>
                </div>
              </div>

              {/* Chọn 5 trong 6 câu */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Ngân hàng câu hỏi (Chọn đúng 5 câu):
                  </label>
                  <span className={`text-xs font-bold ${selectedQuestionIds.length === 5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Đã chọn: {selectedQuestionIds.length} / 5 câu
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {QUESTION_BANK.map((q, idx) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestionSelection(q.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-sky-50 border-sky-300 text-sky-900'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-sky-600"
                          />
                          <span className="font-bold">{q.title}</span>
                          {q.isBackup && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                              Dự phòng
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating || selectedQuestionIds.length !== 5}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  {creating ? 'Đang tạo phòng...' : 'Xác nhận tạo phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal tạo lớp mới */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tạo Lớp học mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập tên lớp và danh sách tên học sinh (mỗi bạn một dòng)
            </p>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp:</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  required
                  placeholder="VD: Lớp 11A2"
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Danh sách học sinh (mỗi em 1 dòng):
                </label>
                <textarea
                  value={studentNamesText}
                  onChange={(e) => setStudentNamesText(e.target.value)}
                  rows={5}
                  placeholder="Nguyễn Văn A&#10;Trần Thị B..."
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  *Hệ thống sẽ tự động cấp mã đăng nhập an toàn (VD: HS013, HS014...).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Tạo lớp & Cấp mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
