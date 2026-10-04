import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store';
import { Room } from '../src/types';

let testRoom: Room;
let student1Id: string;
let student2Id: string;

test('Setup: Tạo phòng kiểm thử cá nhân riêng biệt', () => {
  const teacher = store.getUserByUsername('giaovien')!;
  assert.ok(teacher);
  const classes = store.getClassesByTeacher(teacher.id);

  const selectedQuestions = ['mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'];
  const res = store.createRoom(
    teacher.id,
    classes[0]?.id || 'class-11a1',
    `Phòng Test Cá Nhân ${Date.now()}`,
    selectedQuestions,
    9
  );

  testRoom = res.room;
  assert.ok(testRoom);
  assert.equal(testRoom.status, 'waiting');
});

test('Integration Test 1: Hai học sinh tham gia độc lập bằng biệt danh và avatar', () => {
  const join1 = store.joinRoomParticipant(testRoom.code, 'An Nhiên', 'cat');
  const join2 = store.joinRoomParticipant(testRoom.code, 'Bảo Long', 'dino');

  assert.equal(join1.success, true);
  assert.equal(join2.success, true);

  student1Id = join1.participant!.id;
  student2Id = join2.participant!.id;

  assert.notEqual(student1Id, student2Id);
  assert.equal(join1.participant?.avatar, 'cat');
  assert.equal(join2.participant?.avatar, 'dino');
});

test('Integration Test 2: Từng học sinh lưu bản nháp riêng biệt trên máy chủ', () => {
  // Mở phòng sang running
  store.updateRoom(testRoom.id, { status: 'running' });

  // Học sinh 1 lưu câu 1 chọn opt-1-a
  const draft1 = store.saveDraft(
    student1Id,
    { mcqAnswers: { 'mcq-1': 'opt-1-a' } },
    student1Id
  );
  assert.equal(draft1.success, true);

  // Học sinh 2 lưu câu 1 chọn opt-1-b
  const draft2 = store.saveDraft(
    student2Id,
    { mcqAnswers: { 'mcq-1': 'opt-1-b' } },
    student2Id
  );
  assert.equal(draft2.success, true);

  // Bản nháp của 2 bạn độc lập hoàn toàn
  const saved1 = store.getDraft(student1Id);
  const saved2 = store.getDraft(student2Id);

  assert.equal(saved1?.mcqAnswers['mcq-1'], 'opt-1-a');
  assert.equal(saved2?.mcqAnswers['mcq-1'], 'opt-1-b');
});

test('Integration Test 3: Chống nộp bài lần 2 và chống sửa khi đã nộp', () => {
  // Học sinh 1 nộp bài thi
  const sub1 = store.submitStudent(
    student1Id,
    { 'mcq-1': 'opt-1-a' },
    {
      steps: [{ stepNumber: 1, left: 0, right: 7, mid: 3, aMid: 12, comparison: '<', action: 'keep_right', newLeft: 4, newRight: 7 }],
      finalIndex: 6,
      checkCount: 3,
      eliminationExplanation: 'Em thấy 12 bé hơn 38 nên bỏ nửa trước',
    }
  );

  assert.equal(sub1.success, true, 'Nộp bài lần 1 thành công');
  assert.equal(sub1.submission?.score?.handBreakdown.conclusion.explanationStatus, 'pending_teacher_review');

  // Cố nộp lần 2 khi chưa mở lượt sửa
  const sub1Again = store.submitStudent(
    student1Id,
    { 'mcq-1': 'opt-1-b' },
    { steps: [], finalIndex: 0, checkCount: 0, eliminationExplanation: '' }
  );
  assert.equal(sub1Again.success, false, 'Phải chặn nộp lần 2');

  // Cố sửa nháp sau khi đã nộp
  const editAfterSubmit = store.saveDraft(student1Id, { mcqAnswers: { 'mcq-1': 'opt-1-c' } });
  assert.equal(editAfterSubmit.success, false, 'Không được sửa nháp sau khi đã nộp');
});

test('Integration Test 4: Bằng điểm đồng hạng trên bảng xếp hạng cá nhân', () => {
  // Học sinh 2 nộp bài giống hệt điểm với học sinh 1
  const sub2 = store.submitStudent(
    student2Id,
    { 'mcq-1': 'opt-1-a' },
    {
      steps: [{ stepNumber: 1, left: 0, right: 7, mid: 3, aMid: 12, comparison: '<', action: 'keep_right', newLeft: 4, newRight: 7 }],
      finalIndex: 6,
      checkCount: 3,
      eliminationExplanation: 'Vì 12 < 38 nên loại bỏ phần đầu',
    }
  );
  assert.equal(sub2.success, true);

  const leaderboard = store.getLeaderboard(testRoom.id);
  assert.equal(leaderboard.length, 2);

  const p1Entry = leaderboard.find(e => e.participantId === student1Id)!;
  const p2Entry = leaderboard.find(e => e.participantId === student2Id)!;

  assert.equal(p1Entry.totalScore, p2Entry.totalScore);
  assert.equal(p1Entry.rank, p2Entry.rank, 'Học sinh bằng điểm phải đồng hạng!');
});

test('Integration Test 5: Giáo viên duyệt giải thích, cộng điểm và ghi lý do', () => {
  const adjustRes = store.adjustScore(student1Id, {
    criterion: 'explanation',
    originalPts: 0,
    adjustedPts: 0.5,
    reason: 'Giải thích đúng bản chất dãy tăng dần',
    adjustedAt: new Date().toISOString(),
  });

  assert.equal(adjustRes.success, true);
  const updatedSub = store.getSubmission(student1Id)!;
  assert.equal(updatedSub.score?.handBreakdown.conclusion.explanationStatus, 'accepted');
  assert.equal(updatedSub.score?.handBreakdown.conclusion.explanationPts, 0.5);
  assert.equal(updatedSub.score?.teacherAdjustments?.[0].reason, 'Giải thích đúng bản chất dãy tăng dần');
});
