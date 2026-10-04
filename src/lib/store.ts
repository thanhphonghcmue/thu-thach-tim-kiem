import fs from 'fs';
import path from 'path';
import {
  User,
  ClassRoom,
  Room,
  Group,
  GroupDraft,
  GroupSubmission,
  IndividualReflection,
  LeaderboardEntry,
  RoomStatus,
  SuggestedRole,
  TeacherAdjustment,
} from '@/types';
import { broadcastRoomEvent } from './events';
import { gradeSubmission } from './grading';

interface DatabaseSchema {
  users: Record<string, User>;
  classes: Record<string, ClassRoom>;
  rooms: Record<string, Room>;
  groups: Record<string, Group>;
  drafts: Record<string, GroupDraft>; // groupId -> GroupDraft
  submissions: Record<string, GroupSubmission>; // groupId -> GroupSubmission
  reflections: IndividualReflection[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

class Store {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
    this.ensureSeedData();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading db.json, initializing empty db', err);
    }
    return {
      users: {},
      classes: {},
      rooms: {},
      groups: {},
      drafts: {},
      submissions: {},
      reflections: [],
    };
  }

  private saveDatabase() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json', err);
    }
  }

  private ensureSeedData() {
    // Nếu chưa có giáo viên nào, tạo giáo viên mặc định & 1 lớp mẫu với 12 học sinh
    if (Object.keys(this.data.users).length === 0) {
      const teacherId = 'teacher-gv01';
      this.data.users[teacherId] = {
        id: teacherId,
        role: 'teacher',
        name: 'Thầy Phong (Tin học 11)',
        username: 'giaovien',
        passwordHash: '123456', // Trong môi trường lớp học Tin học
        createdAt: new Date().toISOString(),
      };

      const classId = 'class-11a1';
      const studentIds: string[] = [];

      // Tạo 12 học sinh cho 3 nhóm 4 em
      const sampleNames = [
        'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Diệu Dung',
        'Vũ Anh Dũng', 'Đặng Mai Giang', 'Hoàng Bảo Hưng', 'Ngô Thu Hương',
        'Bùi Minh Khôi', 'Dương Thúy Nga', 'Lý Quốc Nam', 'Trịnh Cẩm Tú'
      ];

      sampleNames.forEach((name, index) => {
        const sId = `student-${index + 1}`;
        const loginCode = `HS${String(index + 1).padStart(3, '0')}`;
        studentIds.push(sId);
        this.data.users[sId] = {
          id: sId,
          role: 'student',
          name,
          username: `hs${index + 1}`,
          loginCode,
          classId,
          createdAt: new Date().toISOString(),
        };
      });

      this.data.classes[classId] = {
        id: classId,
        teacherId,
        name: 'Lớp 11A1 - THPT Chuyên',
        studentIds,
        createdAt: new Date().toISOString(),
      };

      // Tạo một phòng mẫu đang mở để trải nghiệm ngay
      const sampleRoomCode = 'TIMKIEM';
      const sampleRoomId = 'room-sample-01';
      this.data.rooms[sampleRoomId] = {
        id: sampleRoomId,
        code: sampleRoomCode,
        teacherId,
        classId,
        name: 'Thử thách Tìm kiếm - Tiết 2 Luyện tập',
        status: 'waiting',
        selectedQuestionIds: ['mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'],
        timeLimitMinutes: 9,
        remainingSeconds: 9 * 60,
        isLocked: false,
        isRevisionOpen: false,
        createdAt: new Date().toISOString(),
      };

      // Tạo 3 nhóm cho phòng này
      const roleList: SuggestedRole[] = ['driver', 'index_calculator', 'verifier', 'recorder_explainer'];
      for (let g = 1; g <= 3; g++) {
        const gId = `group-${sampleRoomId}-${g}`;
        const gStudentIds = studentIds.slice((g - 1) * 4, g * 4);
        const memberRoles: Record<string, SuggestedRole> = {};
        gStudentIds.forEach((id, idx) => {
          memberRoles[id] = roleList[idx % roleList.length];
        });

        this.data.groups[gId] = {
          id: gId,
          roomId: sampleRoomId,
          name: `Nhóm ${g}`,
          studentIds: gStudentIds,
          driverStudentId: gStudentIds[0], // Bạn đầu tiên làm Người điều khiển
          memberRoles,
          lastSyncedAt: new Date().toISOString(),
        };

        // Khởi tạo bản nháp rỗng
        this.data.drafts[gId] = {
          mcqAnswers: {},
          handTrace: {
            steps: [
              { stepNumber: 1, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
              { stepNumber: 2, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
              { stepNumber: 3, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
            ],
            finalIndex: '',
            checkCount: '',
            eliminationExplanation: '',
          },
          activeQuestionIndex: 0,
          updatedBy: gStudentIds[0],
          updatedAt: new Date().toISOString(),
          version: 1,
        };
      }

      this.saveDatabase();
    }
  }

  // --- USER API ---
  getUserById(id: string): User | undefined {
    return this.data.users[id];
  }

  getUserByUsername(username: string): User | undefined {
    return Object.values(this.data.users).find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  getUserByLoginCode(code: string): User | undefined {
    const clean = code.trim().toUpperCase();
    return Object.values(this.data.users).find(u => u.loginCode && u.loginCode.toUpperCase() === clean);
  }

  createStudent(name: string, username: string, loginCode: string, classId: string): User {
    const id = `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const student: User = {
      id,
      role: 'student',
      name,
      username,
      loginCode,
      classId,
      createdAt: new Date().toISOString(),
    };
    this.data.users[id] = student;

    // Cập nhật vào lớp
    if (this.data.classes[classId]) {
      this.data.classes[classId].studentIds.push(id);
    }

    this.saveDatabase();
    return student;
  }

  // --- CLASS API ---
  getClassesByTeacher(teacherId: string): ClassRoom[] {
    return Object.values(this.data.classes).filter(c => c.teacherId === teacherId);
  }

  getClassById(classId: string): ClassRoom | undefined {
    return this.data.classes[classId];
  }

  createClass(teacherId: string, name: string): ClassRoom {
    const id = `class-${Date.now()}`;
    const newClass: ClassRoom = {
      id,
      teacherId,
      name,
      studentIds: [],
      createdAt: new Date().toISOString(),
    };
    this.data.classes[id] = newClass;
    this.saveDatabase();
    return newClass;
  }

  // --- ROOM API ---
  getRoomsByTeacher(teacherId: string): Room[] {
    return Object.values(this.data.rooms).filter(r => r.teacherId === teacherId);
  }

  getRoomByCode(code: string): Room | undefined {
    const clean = code.trim().toUpperCase();
    return Object.values(this.data.rooms).find(r => r.code.toUpperCase() === clean);
  }

  getRoomById(id: string): Room | undefined {
    return this.data.rooms[id];
  }

  createRoom(
    teacherId: string,
    classId: string,
    name: string,
    selectedQuestionIds: string[],
    timeLimitMinutes: number,
    groupCount: number = 3
  ): { room: Room; groups: Group[] } {
    // Tạo mã phòng ngắn 6 ký tự không trùng
    let code = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (Object.values(this.data.rooms).some(r => r.code === code && r.status !== 'closed'));

    const roomId = `room-${Date.now()}`;
    const room: Room = {
      id: roomId,
      code,
      teacherId,
      classId,
      name,
      status: 'waiting',
      selectedQuestionIds,
      timeLimitMinutes,
      remainingSeconds: timeLimitMinutes * 60,
      isLocked: false,
      isRevisionOpen: false,
      createdAt: new Date().toISOString(),
    };
    this.data.rooms[roomId] = room;

    // Tự động phân chia học sinh trong lớp vào các nhóm
    const targetClass = this.data.classes[classId];
    const studentIds = targetClass ? [...targetClass.studentIds] : [];
    const groups: Group[] = [];
    const roleList: SuggestedRole[] = ['driver', 'index_calculator', 'verifier', 'recorder_explainer'];

    for (let i = 0; i < groupCount; i++) {
      const gId = `group-${roomId}-${i + 1}`;
      // Chia đều học sinh
      const gStudentIds: string[] = [];
      studentIds.forEach((sId, idx) => {
        if (idx % groupCount === i) {
          gStudentIds.push(sId);
        }
      });

      const memberRoles: Record<string, SuggestedRole> = {};
      gStudentIds.forEach((sId, rIdx) => {
        memberRoles[sId] = roleList[rIdx % roleList.length];
      });

      const group: Group = {
        id: gId,
        roomId,
        name: `Nhóm ${i + 1}`,
        studentIds: gStudentIds,
        driverStudentId: gStudentIds[0] || '',
        memberRoles,
        lastSyncedAt: new Date().toISOString(),
      };

      this.data.groups[gId] = group;
      groups.push(group);

      // Tạo draft rỗng
      this.data.drafts[gId] = {
        mcqAnswers: {},
        handTrace: {
          steps: [
            { stepNumber: 1, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
            { stepNumber: 2, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
            { stepNumber: 3, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
          ],
          finalIndex: '',
          checkCount: '',
          eliminationExplanation: '',
        },
        activeQuestionIndex: 0,
        updatedBy: gStudentIds[0] || '',
        updatedAt: new Date().toISOString(),
        version: 1,
      };
    }

    this.saveDatabase();
    return { room, groups };
  }

  updateRoom(roomId: string, updates: Partial<Room>): Room | undefined {
    const room = this.data.rooms[roomId];
    if (!room) return undefined;

    Object.assign(room, updates);
    this.saveDatabase();

    broadcastRoomEvent({
      type: 'room_updated',
      roomId,
      data: room,
    });

    return room;
  }

  // --- GROUP API ---
  getGroupsByRoom(roomId: string): Group[] {
    return Object.values(this.data.groups).filter(g => g.roomId === roomId);
  }

  getGroupById(groupId: string): Group | undefined {
    return this.data.groups[groupId];
  }

  setGroupDriver(groupId: string, newDriverStudentId: string): Group | undefined {
    const group = this.data.groups[groupId];
    if (!group) return undefined;

    group.driverStudentId = newDriverStudentId;
    group.lastSyncedAt = new Date().toISOString();
    this.saveDatabase();

    broadcastRoomEvent({
      type: 'driver_changed',
      roomId: group.roomId,
      data: { groupId, driverStudentId: newDriverStudentId },
    });

    return group;
  }

  // --- DRAFT & REALTIME SYNC ---
  getDraft(groupId: string): GroupDraft | undefined {
    return this.data.drafts[groupId];
  }

  saveDraft(groupId: string, draftData: Partial<GroupDraft>, studentId: string): { success: boolean; draft?: GroupDraft; error?: string } {
    const group = this.data.groups[groupId];
    if (!group) return { success: false, error: 'Không tìm thấy nhóm' };

    const room = this.data.rooms[group.roomId];
    if (!room) return { success: false, error: 'Không tìm thấy phòng' };

    // Kiểm tra quyền: Chỉ driver mới được sửa
    if (group.driverStudentId !== studentId) {
      return { success: false, error: 'Chỉ Người điều khiển nhóm mới có quyền lưu bài làm' };
    }

    // Không được sửa khi phòng đã đóng hoặc đang tạm dừng
    if (room.status !== 'running') {
      return { success: false, error: `Phòng thi hiện đang ở trạng thái: ${room.status}` };
    }

    // Không được sửa nếu đã nộp bài chính thức
    if (this.data.submissions[groupId]?.submittedAt && !room.isRevisionOpen) {
      return { success: false, error: 'Nhóm đã nộp bài chính thức, không thể sửa' };
    }

    const existingDraft = this.data.drafts[groupId];
    const newVersion = (existingDraft?.version || 0) + 1;

    const updatedDraft: GroupDraft = {
      mcqAnswers: draftData.mcqAnswers !== undefined ? draftData.mcqAnswers : (existingDraft?.mcqAnswers || {}),
      handTrace: draftData.handTrace !== undefined ? draftData.handTrace : (existingDraft?.handTrace || {
        steps: [],
        finalIndex: '',
        checkCount: '',
        eliminationExplanation: '',
      }),
      activeQuestionIndex: draftData.activeQuestionIndex !== undefined ? draftData.activeQuestionIndex : (existingDraft?.activeQuestionIndex || 0),
      updatedBy: studentId,
      updatedAt: new Date().toISOString(),
      version: newVersion,
    };

    this.data.drafts[groupId] = updatedDraft;
    group.lastSyncedAt = new Date().toISOString();
    this.saveDatabase();

    broadcastRoomEvent({
      type: 'group_draft_updated',
      roomId: group.roomId,
      data: { groupId, draft: updatedDraft },
    });

    return { success: true, draft: updatedDraft };
  }

  // --- SUBMISSIONS & GRADING ---
  getSubmission(groupId: string): GroupSubmission | undefined {
    return this.data.submissions[groupId];
  }

  getAllSubmissions(roomId: string): GroupSubmission[] {
    const groups = this.getGroupsByRoom(roomId);
    const groupIds = new Set(groups.map(g => g.id));
    return Object.values(this.data.submissions).filter(s => groupIds.has(s.groupId));
  }

  submitGroup(
    groupId: string,
    studentId: string,
    mcqAnswers: Record<string, string>,
    handTrace: any,
    isRevision: boolean = false
  ): { success: boolean; submission?: GroupSubmission; error?: string } {
    const group = this.data.groups[groupId];
    if (!group) return { success: false, error: 'Không tìm thấy nhóm' };

    const room = this.data.rooms[group.roomId];
    if (!room) return { success: false, error: 'Không tìm thấy phòng' };

    if (group.driverStudentId !== studentId) {
      return { success: false, error: 'Chỉ Người điều khiển nhóm mới có quyền nộp bài' };
    }

    // Nếu đã nộp trước đó và không phải lượt sửa
    if (this.data.submissions[groupId] && !isRevision && !room.isRevisionOpen) {
      return { success: false, error: 'Bài làm của nhóm đã được nộp trước đó' };
    }

    // Tính điểm tự động qua rubric engine
    const score = gradeSubmission(mcqAnswers, handTrace, room.selectedQuestionIds);

    const submission: GroupSubmission = {
      id: `sub-${groupId}-${Date.now()}`,
      roomId: room.id,
      groupId,
      mcqAnswers,
      handTrace,
      submittedAt: new Date().toISOString(),
      submittedBy: studentId,
      version: (this.data.submissions[groupId]?.version || 0) + 1,
      score,
      isRevised: isRevision,
    };

    this.data.submissions[groupId] = submission;
    this.saveDatabase();

    broadcastRoomEvent({
      type: 'submission_received',
      roomId: room.id,
      data: {
        groupId,
        submittedAt: submission.submittedAt,
        score: room.status === 'published' ? score : undefined, // Bảo mật: Không công bố điểm trước khi giáo viên công bố
      },
    });

    return { success: true, submission };
  }

  // Giáo viên duyệt và điều chỉnh điểm từng tiêu chí kèm lý do
  adjustScore(
    groupId: string,
    adjustment: TeacherAdjustment
  ): { success: boolean; submission?: GroupSubmission; error?: string } {
    const sub = this.data.submissions[groupId];
    if (!sub || !sub.score) return { success: false, error: 'Chưa có bài nộp để điều chỉnh điểm' };

    if (!sub.score.teacherAdjustments) {
      sub.score.teacherAdjustments = [];
    }
    sub.score.teacherAdjustments.push(adjustment);

    // Cập nhật lại điểm
    if (adjustment.criterion === 'explanation') {
      sub.score.handBreakdown.conclusion.explanationStatus = adjustment.adjustedPts > 0 ? 'accepted' : 'rejected';
      sub.score.handBreakdown.conclusion.explanationPts = adjustment.adjustedPts;
      sub.score.handBreakdown.pendingReviewScore = 0;
      sub.score.pendingReviewScore = 0;

      // Tính lại tổng handScore & totalScore
      const stepsTotal = sub.score.handBreakdown.steps.reduce((sum, s) => sum + s.stepTotal, 0);
      const concTotal = sub.score.handBreakdown.conclusion.indexPts + sub.score.handBreakdown.conclusion.countPts + adjustment.adjustedPts;
      sub.score.handScore = Number(Math.min(5.0, stepsTotal + concTotal).toFixed(2));
      sub.score.totalScore = Number(Math.min(10.0, sub.score.mcqScore + sub.score.handScore).toFixed(2));
    }

    this.saveDatabase();

    broadcastRoomEvent({
      type: 'scores_published',
      roomId: sub.roomId,
      data: { groupId, score: sub.score },
    });

    return { success: true, submission: sub };
  }

  // --- REFLECTIONS ---
  addReflection(reflection: Omit<IndividualReflection, 'id' | 'submittedAt'>): IndividualReflection {
    const entry: IndividualReflection = {
      ...reflection,
      id: `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submittedAt: new Date().toISOString(),
    };
    this.data.reflections.push(entry);
    this.saveDatabase();

    broadcastRoomEvent({
      type: 'reflection_added',
      roomId: reflection.roomId,
      data: entry,
    });

    return entry;
  }

  getReflectionsByRoom(roomId: string): IndividualReflection[] {
    return this.data.reflections.filter(r => r.roomId === roomId);
  }

  // --- LEADERBOARD ---
  getLeaderboard(roomId: string): LeaderboardEntry[] {
    const groups = this.getGroupsByRoom(roomId);
    const room = this.data.rooms[roomId];

    const entries: LeaderboardEntry[] = groups.map(g => {
      const sub = this.data.submissions[g.id];
      const memberNames = g.studentIds.map(sId => this.data.users[sId]?.name || sId);

      if (!sub || !sub.score) {
        return {
          rank: 0,
          groupId: g.id,
          groupName: g.name,
          members: memberNames,
          mcqScore: 0,
          handScore: 0,
          totalScore: 0,
          isPendingReview: false,
          isSubmitted: false,
        };
      }

      return {
        rank: 0,
        groupId: g.id,
        groupName: g.name,
        members: memberNames,
        mcqScore: sub.score.mcqScore,
        handScore: sub.score.handScore,
        totalScore: sub.score.totalScore,
        isPendingReview: sub.score.pendingReviewScore > 0,
        isSubmitted: true,
        submittedAt: sub.submittedAt,
        isRevised: sub.isRevised,
      };
    });

    // Sắp xếp giảm dần theo totalScore (không phá hòa bằng thời gian)
    entries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.groupName.localeCompare(b.groupName);
    });

    // Gán thứ hạng: Bằng điểm = Đồng hạng!
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].totalScore === entries[i - 1].totalScore) {
        entries[i].rank = entries[i - 1].rank;
      } else {
        entries[i].rank = currentRank;
      }
      currentRank++;
    }

    return entries;
  }
}

// Global singleton instance across Next.js API requests
declare global {
  var __appStore: Store | undefined;
}

if (!global.__appStore) {
  global.__appStore = new Store();
}

export const store = global.__appStore;
