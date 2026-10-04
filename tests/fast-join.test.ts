import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store';

let freshRoomCode = '';

test('Setup: Tạo phòng riêng cho Fast Join Cá Nhân', () => {
  const teacher = store.getUserByUsername('giaovien')!;
  const classes = store.getClassesByTeacher(teacher.id);

  const { room } = store.createRoom(
    teacher.id,
    classes[0]?.id || 'class-11a1',
    `Phòng Fast Join Cá Nhân ${Date.now()}`,
    ['mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'],
    9
  );

  freshRoomCode = room.code;
  assert.ok(freshRoomCode);
});

test('Fast Join 1: Học sinh tham gia nhanh bằng biệt danh và avatar không cần tài khoản', () => {
  const room = store.getRoomByCode(freshRoomCode)!;

  // Học sinh 1 tham gia
  const join1 = store.joinRoomParticipant(room.code, 'Bé Mèo Dễ Thương', 'cat');
  assert.equal(join1.success, true);
  assert.equal(join1.participant?.nickname, 'Bé Mèo Dễ Thương');
  assert.equal(join1.participant?.avatar, 'cat');
  assert.equal(join1.participant?.isReady, false);
  assert.equal(join1.participant?.isOnline, true);
});

test('Fast Join 2: Xử lý trùng biệt danh trong cùng phòng (thêm số tự động)', () => {
  // Tham gia cùng tên "Minh Anh" trong phòng
  const joinA = store.joinRoomParticipant(freshRoomCode, 'Minh Anh', 'rabbit');
  const joinB = store.joinRoomParticipant(freshRoomCode, 'Minh Anh', 'panda');

  assert.equal(joinA.success, true);
  assert.equal(joinB.success, true);
  assert.equal(joinA.participant?.nickname, 'Minh Anh');
  assert.equal(joinB.participant?.nickname, 'Minh Anh (2)', 'Phải thêm số phân biệt khi trùng biệt danh');
});

test('Fast Join 3: Học sinh bật/tắt trạng thái Sẵn sàng', () => {
  const join = store.joinRoomParticipant(freshRoomCode, 'Khủng Long Nhí', 'dino');
  assert.ok(join.participant);

  // Bật sẵn sàng
  store.setParticipantReady(join.participant.id, true);
  let p = store.getParticipantById(join.participant.id);
  assert.equal(p?.isReady, true);

  // Tắt sẵn sàng
  store.setParticipantReady(join.participant.id, false);
  p = store.getParticipantById(join.participant.id);
  assert.equal(p?.isReady, false);
});

test('Fast Join 4: Giáo viên đổi tên và loại học sinh khỏi phòng', () => {
  const room = store.getRoomByCode(freshRoomCode)!;
  const join = store.joinRoomParticipant(freshRoomCode, 'Học Sinh Lạ', 'fox');
  const pId = join.participant?.id!;

  // 1. Giáo viên đổi tên
  const renameRes = store.manageParticipant(room.code, room.teacherId, pId, 'rename', { newName: 'Nguyễn Văn Em' });
  assert.equal(renameRes.success, true);
  assert.equal(store.getParticipantById(pId)?.nickname, 'Nguyễn Văn Em');

  // 2. Giáo viên loại khỏi phòng (kick)
  const kickRes = store.manageParticipant(room.code, room.teacherId, pId, 'kick', {});
  assert.equal(kickRes.success, true);
  assert.equal(store.getParticipantById(pId), undefined);
});
