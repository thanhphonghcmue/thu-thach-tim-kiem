import fs from 'fs';
import path from 'path';
import os from 'os';
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
  Participant,
  StudentDraft,
  StudentSubmission,
} from '@/types';
import { broadcastRoomEvent } from './events';
import { gradeSubmission } from './grading';

interface DatabaseSchema {
  users: Record<string, User>;
  classes: Record<string, ClassRoom>;
  rooms: Record<string, Room>;
  groups: Record<string, Group>;
  participants: Record<string, Participant>; // participantId -> Participant
  drafts: Record<string, GroupDraft>; // groupId -> GroupDraft
  submissions: Record<string, GroupSubmission>; // groupId -> GroupSubmission
  reflections: IndividualReflection[];
}

const getDbDir = () => {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const defaultDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    return defaultDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'thu-thach-tim-kiem-data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
};

class Store {
  private data: DatabaseSchema;
  private dbFile: string;

  constructor() {
    const dbDir = getDbDir();
    this.dbFile = path.join(dbDir, 'db.json');
    this.data = this.loadDatabase();
    this.ensureSeedData();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.participants) parsed.participants = {};
        return parsed;
      }
    } catch (err) {
      console.error('Error loading db.json, initializing empty db', err);
    }
    return {
      users: {},
      classes: {},
      rooms: {},
      groups: {},
      participants: {},
      drafts: {},
      submissions: {},
      reflections: [],
    };
  }

  private saveDatabase() {
    try {
      const dir = path.dirname(this.dbFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbFile, JSON.stringify(this.data, null, 2), 'utf-8');
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

  // --- PARTICIPANTS API (Tham gia nhanh bằng biệt danh & avatar) ---
  getParticipantById(id: string): Participant | undefined {
    return this.data.participants[id];
  }

  getParticipantsByRoom(roomId: string): Participant[] {
    return Object.values(this.data.participants).filter(p => p.roomId === roomId);
  }

  joinRoomParticipant(
    roomCode: string,
    nickname: string,
    avatar: any,
    targetGroupId?: string
  ): { success: boolean; participant?: Participant; error?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      return { success: false, error: 'Phòng thi không tồn tại hoặc đã bị đóng' };
    }

    if (room.isLocked) {
      return { success: false, error: 'Phòng thi đã bị khóa, không nhận thêm người tham gia' };
    }

    if (room.status === 'closed') {
      return { success: false, error: 'Phòng thi này đã kết thúc' };
    }

    const cleanNick = nickname.trim();
    if (!cleanNick) {
      return { success: false, error: 'Vui lòng nhập tên hoặc biệt danh của bạn' };
    }

    // Xử lý trùng biệt danh trong cùng phòng: thêm số (VD: "Nam (2)")
    const existingInRoom = this.getParticipantsByRoom(room.id);
    let finalNickname = cleanNick;
    let duplicateCount = 1;
    while (existingInRoom.some(p => p.nickname.toLowerCase() === finalNickname.toLowerCase())) {
      duplicateCount++;
      finalNickname = `${cleanNick} (${duplicateCount})`;
    }

    const participantId = `p-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const participant: Participant = {
      id: participantId,
      roomId: room.id,
      nickname: finalNickname,
      avatar: avatar || 'cat',
      isReady: false,
      isOnline: true,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    this.data.participants[participantId] = participant;

    // Khởi tạo sẵn bản nháp riêng biệt cho học sinh này
    this.data.drafts[participantId] = {
      participantId,
      mcqAnswers: {},
      handTrace: {
        steps: [
          { stepNumber: 1, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
          { stepNumber: 2, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
        ],
        finalIndex: '',
        checkCount: '',
        eliminationExplanation: '',
      },
      activeQuestionIndex: 0,
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    this.saveDatabase();

    broadcastRoomEvent({
      type: 'room_updated',
      roomId: room.id,
      data: { action: 'participant_joined', participant },
    });

    return { success: true, participant };
  }

  setParticipantReady(participantId: string, isReady: boolean): boolean {
    const p = this.data.participants[participantId];
    if (!p) return false;

    p.isReady = isReady;
    p.lastActive = new Date().toISOString();
    this.saveDatabase();

    broadcastRoomEvent({
      type: 'room_updated',
      roomId: p.roomId,
      data: { action: 'participant_ready_changed', participantId, isReady },
    });

    return true;
  }

  manageParticipant(
    roomCode: string,
    teacherId: string,
    participantId: string,
    action: 'rename' | 'move_group' | 'kick',
    payload: any
  ): { success: boolean; error?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room || room.teacherId !== teacherId) {
      return { success: false, error: 'Chỉ giáo viên sở hữu phòng mới có quyền điều chỉnh' };
    }

    const p = this.data.participants[participantId];
    if (!p) return { success: false, error: 'Không tìm thấy người tham gia' };

    if (action === 'kick') {
      delete this.data.participants[participantId];
      delete this.data.drafts[participantId];
      delete this.data.submissions[participantId];
      this.saveDatabase();

      broadcastRoomEvent({
        type: 'room_updated',
        roomId: room.id,
        data: { action: 'participant_kicked', participantId },
      });
      return { success: true };
    }

    if (action === 'rename') {
      const newName = (payload.newName || '').trim();
      if (!newName) return { success: false, error: 'Tên không hợp lệ' };
      p.nickname = newName;
      this.saveDatabase();

      broadcastRoomEvent({
        type: 'room_updated',
        roomId: room.id,
        data: { action: 'participant_renamed', participant: p },
      });
      return { success: true };
    }

    return { success: false, error: 'Hành động không hợp lệ' };
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
    return { room, groups: [] };
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

  // --- GROUP API (Tương thích) ---
  getGroupsByRoom(roomId: string): Group[] {
    return Object.values(this.data.groups).filter(g => g.roomId === roomId);
  }

  getGroupById(groupId: string): Group | undefined {
    return this.data.groups[groupId];
  }

  setGroupDriver(groupId: string, newDriverStudentId: string): Group | undefined {
    const group = this.data.groups[groupId];
    if (group) {
      group.driverStudentId = newDriverStudentId;
      this.saveDatabase();
    }
    return group;
  }

  // --- DRAFT & REALTIME SYNC (CÁ NHÂN) ---
  getDraft(targetId: string): StudentDraft | undefined {
    return this.data.drafts[targetId];
  }

  saveDraft(
    targetId: string,
    draftData: Partial<StudentDraft>,
    studentId?: string
  ): { success: boolean; draft?: StudentDraft; error?: string } {
    const id = targetId || studentId;
    if (!id) return { success: false, error: 'Thiếu định danh học sinh' };

    const participant = this.data.participants[id];
    const roomId = participant?.roomId;
    const room = roomId ? this.data.rooms[roomId] : Object.values(this.data.rooms).find(r => r.status === 'running');

    if (room && room.status !== 'running') {
      return { success: false, error: `Phòng thi hiện đang ở trạng thái: ${room.status}` };
    }

    if (this.data.submissions[id]?.submittedAt && (!room || !room.isRevisionOpen)) {
      return { success: false, error: 'Học sinh đã nộp bài chính thức, không thể sửa' };
    }

    const existingDraft = this.data.drafts[id];
    const newVersion = (existingDraft?.version || 0) + 1;

    const updatedDraft: StudentDraft = {
      participantId: id,
      mcqAnswers: draftData.mcqAnswers !== undefined ? draftData.mcqAnswers : (existingDraft?.mcqAnswers || {}),
      handTrace: draftData.handTrace !== undefined ? draftData.handTrace : (existingDraft?.handTrace || {
        steps: [],
        finalIndex: '',
        checkCount: '',
        eliminationExplanation: '',
      }),
      activeQuestionIndex: draftData.activeQuestionIndex !== undefined ? draftData.activeQuestionIndex : (existingDraft?.activeQuestionIndex || 0),
      updatedAt: new Date().toISOString(),
      version: newVersion,
    };

    this.data.drafts[id] = updatedDraft;
    if (participant) {
      participant.lastActive = new Date().toISOString();
    }
    this.saveDatabase();

    if (roomId) {
      broadcastRoomEvent({
        type: 'group_draft_updated',
        roomId,
        data: { participantId: id, groupId: id, draft: updatedDraft },
      });
    }

    return { success: true, draft: updatedDraft };
  }

  // --- SUBMISSIONS & GRADING (CÁ NHÂN) ---
  getSubmission(targetId: string): StudentSubmission | undefined {
    return this.data.submissions[targetId];
  }

  getAllSubmissions(roomId: string): StudentSubmission[] {
    const participants = this.getParticipantsByRoom(roomId);
    const participantIds = new Set(participants.map(p => p.id));
    return Object.values(this.data.submissions).filter(s => (s.participantId ? participantIds.has(s.participantId) : false) || s.roomId === roomId);
  }

  submitStudent(
    studentId: string,
    mcqAnswers: Record<string, string>,
    handTrace: any,
    isRevision: boolean = false
  ): { success: boolean; submission?: StudentSubmission; error?: string } {
    const participant = this.data.participants[studentId];
    const roomId = participant?.roomId || (Object.values(this.data.rooms).find(r => r.status === 'running')?.id);
    const room = roomId ? this.data.rooms[roomId] : undefined;

    if (!room) return { success: false, error: 'Không tìm thấy phòng thi' };

    if (this.data.submissions[studentId] && !isRevision && !room.isRevisionOpen) {
      return { success: false, error: 'Bài làm của bạn đã được nộp trước đó' };
    }

    const nickname = participant?.nickname || 'Học sinh';
    const avatar = participant?.avatar || 'cat';
    const score = gradeSubmission(mcqAnswers, handTrace, room.selectedQuestionIds);

    const submission: StudentSubmission = {
      id: `sub-${studentId}-${Date.now()}`,
      roomId: room.id,
      participantId: studentId,
      groupId: studentId,
      nickname,
      avatar,
      mcqAnswers,
      handTrace,
      submittedAt: new Date().toISOString(),
      submittedBy: studentId,
      version: (this.data.submissions[studentId]?.version || 0) + 1,
      score,
      isRevised: isRevision,
    };

    this.data.submissions[studentId] = submission;
    this.saveDatabase();

    broadcastRoomEvent({
      type: 'submission_received',
      roomId: room.id,
      data: {
        participantId: studentId,
        groupId: studentId,
        nickname,
        submittedAt: submission.submittedAt,
        score: room.status === 'published' ? score : undefined,
      },
    });

    return { success: true, submission };
  }

  submitGroup(
    groupId: string,
    studentId: string,
    mcqAnswers: Record<string, string>,
    handTrace: any,
    isRevision: boolean = false
  ): { success: boolean; submission?: StudentSubmission; error?: string } {
    return this.submitStudent(studentId || groupId, mcqAnswers, handTrace, isRevision);
  }

  // Giáo viên duyệt và điều chỉnh điểm từng tiêu chí kèm lý do
  adjustScore(
    targetId: string,
    adjustment: TeacherAdjustment
  ): { success: boolean; submission?: StudentSubmission; error?: string } {
    const sub = this.data.submissions[targetId];
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
      data: { participantId: targetId, groupId: targetId, score: sub.score },
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

  // --- LEADERBOARD (CÁ NHÂN) ---
  getLeaderboard(roomId: string): LeaderboardEntry[] {
    const participants = this.getParticipantsByRoom(roomId);

    let entries: LeaderboardEntry[] = [];
    if (participants.length > 0) {
      entries = participants.map(p => {
        const sub = this.data.submissions[p.id];
        if (!sub || !sub.score) {
          return {
            rank: 0,
            participantId: p.id,
            nickname: p.nickname,
            avatar: p.avatar,
            mcqScore: 0,
            handScore: 0,
            totalScore: 0,
            isPendingReview: false,
            isSubmitted: false,
          };
        }

        return {
          rank: 0,
          participantId: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          mcqScore: sub.score.mcqScore,
          handScore: sub.score.handScore,
          totalScore: sub.score.totalScore,
          isPendingReview: (sub.score.pendingReviewScore || 0) > 0,
          isSubmitted: true,
          submittedAt: sub.submittedAt,
          isRevised: sub.isRevised,
        };
      });
    } else {
      const subs = Object.values(this.data.submissions).filter(s => s.roomId === roomId);
      entries = subs.map(sub => ({
        rank: 0,
        participantId: sub.participantId || sub.id,
        nickname: sub.nickname || 'Học sinh',
        avatar: sub.avatar || 'cat',
        mcqScore: sub.score?.mcqScore || 0,
        handScore: sub.score?.handScore || 0,
        totalScore: sub.score?.totalScore || 0,
        isPendingReview: (sub.score?.pendingReviewScore || 0) > 0,
        isSubmitted: true,
        submittedAt: sub.submittedAt,
        isRevised: sub.isRevised,
      }));
    }

    // Sắp xếp giảm dần theo totalScore (học sinh bằng điểm đồng hạng, không phân bằng thời gian)
    entries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.nickname.localeCompare(b.nickname);
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
