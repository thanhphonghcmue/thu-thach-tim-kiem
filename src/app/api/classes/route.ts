import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'Thiếu teacherId' }, { status: 400 });
  }

  const classes = store.getClassesByTeacher(teacherId);
  const enhancedClasses = classes.map(c => {
    const students = c.studentIds.map(sId => store.getUserById(sId)).filter(Boolean);
    return {
      ...c,
      students,
    };
  });

  return NextResponse.json({ classes: enhancedClasses });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, name, studentNames } = body;

    if (!teacherId || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin tạo lớp' }, { status: 400 });
    }

    const newClass = store.createClass(teacherId, name);

    // Nếu có danh sách tên học sinh, tự sinh tài khoản học sinh
    if (Array.isArray(studentNames) && studentNames.length > 0) {
      studentNames.forEach((sName: string, idx: number) => {
        if (!sName.trim()) return;
        const code = `HS${Math.floor(100 + Math.random() * 900)}`;
        const username = `hs_${Date.now().toString().slice(-4)}_${idx + 1}`;
        store.createStudent(sName.trim(), username, code, newClass.id);
      });
    }

    const updated = store.getClassById(newClass.id);
    const students = updated?.studentIds.map(sId => store.getUserById(sId)).filter(Boolean);

    return NextResponse.json({ class: { ...updated, students } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tạo lớp' }, { status: 500 });
  }
}
