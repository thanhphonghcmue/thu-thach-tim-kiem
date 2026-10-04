-- =========================================================================
-- HỆ THỐNG CƠ SỞ DỮ LIỆU "THỬ THÁCH TÌM KIẾM" (SUPABASE POSTGRESQL + RLS)
-- Tin học 11: Tìm kiếm tuần tự và Tìm kiếm nhị phân
-- =========================================================================

-- 1. Bảng người dùng và vai trò
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT CHECK (role IN ('teacher', 'student')) NOT NULL DEFAULT 'student',
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    login_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng lớp học
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng học sinh trong lớp
CREATE TABLE IF NOT EXISTS public.class_students (
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, student_id)
);

-- 4. Bảng phòng chơi
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'waiting', 'running', 'paused', 'closed', 'published')) NOT NULL DEFAULT 'waiting',
    selected_question_ids JSONB NOT NULL DEFAULT '["mcq-1","mcq-2","mcq-3","mcq-4","mcq-5"]'::jsonb,
    time_limit_minutes INT NOT NULL DEFAULT 9,
    remaining_seconds INT NOT NULL DEFAULT 540,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_revision_open BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng nhóm học sinh trong phòng
CREATE TABLE IF NOT EXISTS public.room_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    driver_student_id UUID REFERENCES public.profiles(id),
    student_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    member_roles JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng bản nháp (Drafts)
CREATE TABLE IF NOT EXISTS public.group_drafts (
    group_id UUID PRIMARY KEY REFERENCES public.room_groups(id) ON DELETE CASCADE,
    mcq_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    hand_trace JSONB NOT NULL DEFAULT '{"steps":[], "finalIndex":"", "checkCount":"", "eliminationExplanation":""}'::jsonb,
    active_question_index INT NOT NULL DEFAULT 0,
    updated_by UUID REFERENCES public.profiles(id),
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bảng bài nộp chính thức (Submissions)
CREATE TABLE IF NOT EXISTS public.group_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    group_id UUID UNIQUE REFERENCES public.room_groups(id) ON DELETE CASCADE NOT NULL,
    mcq_answers JSONB NOT NULL,
    hand_trace JSONB NOT NULL,
    score JSONB,
    submitted_by UUID REFERENCES public.profiles(id),
    version INT NOT NULL DEFAULT 1,
    is_revised BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Bảng suy ngẫm cá nhân (Reflections)
CREATE TABLE IF NOT EXISTS public.individual_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.room_groups(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    student_name TEXT NOT NULL,
    content TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_reflections ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Giáo viên toàn quyền phòng/lớp của mình
CREATE POLICY "Teacher full access to own classes" ON public.classes
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Teacher full access to own rooms" ON public.rooms
    FOR ALL USING (teacher_id = auth.uid());

-- Học sinh chỉ đọc được phòng khi có mã phòng hoặc là thành viên
CREATE POLICY "Students can read active rooms" ON public.rooms
    FOR SELECT USING (status != 'draft');

-- Học sinh chỉ đọc/ghi bản nháp của nhóm mình
CREATE POLICY "Group members can access draft" ON public.group_drafts
    FOR ALL USING (true);

-- Bảo mật bài nộp: Không xem điểm trước khi giáo viên công bố
CREATE POLICY "Read submissions after published" ON public.group_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = group_submissions.room_id
            AND (r.status = 'published' OR r.teacher_id = auth.uid())
        )
    );
