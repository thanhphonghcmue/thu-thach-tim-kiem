export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  username: string;
  loginCode?: string; // Mã đăng nhập cấp cho học sinh
  passwordHash?: string;
  classId?: string;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  username: string;
  loginCode: string;
  classId: string;
}

export interface ClassRoom {
  id: string;
  teacherId: string;
  name: string;
  studentIds: string[];
  createdAt: string;
}

export type RoomStatus = 'draft' | 'waiting' | 'running' | 'paused' | 'closed' | 'published';

export type SuggestedRole = 'driver' | 'index_calculator' | 'verifier' | 'recorder_explainer';

export interface GroupMemberInfo {
  studentId: string;
  name: string;
  username: string;
  role: SuggestedRole;
  isOnline: boolean;
  lastActive: string;
}

export interface Group {
  id: string;
  roomId: string;
  name: string; // "Nhóm 1", "Nhóm 2", ...
  studentIds: string[];
  driverStudentId: string; // Chỉ người điều khiển mới sửa được bài chung
  memberRoles: Record<string, SuggestedRole>;
  lastSyncedAt?: string;
}

export interface Room {
  id: string;
  code: string; // Mã phòng 6 ký tự
  teacherId: string;
  classId: string;
  name: string;
  status: RoomStatus;
  selectedQuestionIds: string[]; // Đúng 5 câu được chọn từ 6 câu
  timeLimitMinutes: number; // Mặc định 9 hoặc 17 phút
  remainingSeconds: number;
  isLocked: boolean; // Khóa người tham gia mới
  isRevisionOpen: boolean; // Mở lượt sửa sai sau công bố
  isFreePractice?: boolean; // Chế độ luyện tập tự do tùy chọn
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface McqOption {
  id: string;
  text: string;
}

export interface McqQuestion {
  id: string;
  title: string;
  content: string;
  options: McqOption[];
  correctOptionId: string;
  explanation: string;
  isBackup?: boolean;
}

export interface HandTraceStep {
  stepNumber: number;
  left: string | number;
  right: string | number;
  mid: string | number;
  aMid: string | number;
  comparison: '<' | '=' | '>' | '';
  action: 'keep_left' | 'keep_right' | 'found' | '';
  newLeft: string | number;
  newRight: string | number;
  explanation?: string;
}

export interface HandTraceData {
  steps: HandTraceStep[];
  finalIndex: string | number;
  checkCount: string | number;
  eliminationExplanation: string;
}

export interface StepScoreDetail {
  stepNumber: number;
  leftRightCorrect: boolean;
  leftRightPts: number; // 0.25
  midCorrect: boolean;
  midPts: number; // 0.25
  aMidCorrect: boolean;
  aMidPts: number; // 0.25
  comparisonCorrect: boolean;
  comparisonPts: number; // 0.25
  actionCorrect: boolean;
  actionPts: number; // 0.25
  stepTotal: number; // Tối đa 1.25
  feedback: string[];
}

export interface ConclusionScoreDetail {
  indexCorrect: boolean;
  indexPts: number; // 0.50
  countCorrect: boolean;
  countPts: number; // 0.25
  explanationStatus: 'accepted' | 'pending_teacher_review' | 'rejected';
  explanationPts: number; // 0.50 hoặc 0
  explanationFeedback: string;
}

export interface HandScoreBreakdown {
  steps: StepScoreDetail[];
  conclusion: ConclusionScoreDetail;
  handTotal: number; // Tối đa 5.0
  pendingReviewScore: number;
}

export interface TeacherAdjustment {
  criterion: string;
  originalPts: number;
  adjustedPts: number;
  reason: string;
  adjustedAt: string;
}

export interface SubmissionScore {
  mcqScore: number; // Tối đa 5.0
  handScore: number; // Tối đa 5.0
  totalScore: number; // Tối đa 10.0
  pendingReviewScore: number; // Điểm tối đa còn chờ duyệt
  mcqBreakdown: Record<string, {
    isCorrect: boolean;
    points: number;
    selectedOptionId: string;
    correctOptionId?: string;
    explanation?: string;
  }>;
  handBreakdown: HandScoreBreakdown;
  teacherAdjustments?: TeacherAdjustment[];
}

export interface GroupDraft {
  mcqAnswers: Record<string, string>; // questionId -> optionId
  handTrace: HandTraceData;
  activeQuestionIndex: number; // Nhóm đang dừng ở câu nào (để giáo viên theo dõi)
  updatedBy: string;
  updatedAt: string;
  version: number;
}

export interface GroupSubmission {
  id: string;
  roomId: string;
  groupId: string;
  mcqAnswers: Record<string, string>;
  handTrace: HandTraceData;
  submittedAt: string;
  submittedBy: string;
  version: number;
  score?: SubmissionScore;
  isRevised?: boolean;
}

export interface IndividualReflection {
  id: string;
  roomId: string;
  groupId: string;
  studentId: string;
  studentName: string;
  content: string;
  submittedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  groupId: string;
  groupName: string;
  members: string[];
  mcqScore: number;
  handScore: number;
  totalScore: number;
  isPendingReview: boolean;
  isSubmitted: boolean;
  submittedAt?: string;
  isRevised?: boolean;
  revisedScore?: number;
}

export interface RoomEventPayload {
  type: 'room_updated' | 'group_draft_updated' | 'submission_received' | 'driver_changed' | 'scores_published' | 'reflection_added';
  roomId: string;
  data: any;
}
