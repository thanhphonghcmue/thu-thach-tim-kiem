import React from 'react';
import { SuggestedRole } from '@/types';
import { ShieldCheck, Cpu, CheckCircle2, FileEdit } from 'lucide-react';

interface RoleBadgeProps {
  role?: SuggestedRole;
  isDriver?: boolean;
}

export const ROLE_INFO: Record<SuggestedRole, { label: string; desc: string; icon: any; color: string }> = {
  driver: {
    label: 'Người điều khiển',
    desc: 'Thao tác và lưu câu trả lời chính thức của nhóm',
    icon: ShieldCheck,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  index_calculator: {
    label: 'Người tính chỉ số',
    desc: 'Tính toán công thức mid = left + (right - left)/2',
    icon: Cpu,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  verifier: {
    label: 'Người kiểm chứng',
    desc: 'Kiểm tra điều kiện dừng và so sánh A[mid] với K',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  recorder_explainer: {
    label: 'Người ghi & giải thích',
    desc: 'Ghi lý do loại phạm vi và hoàn thiện giải thích',
    icon: FileEdit,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
};

export default function RoleBadge({ role, isDriver }: RoleBadgeProps) {
  if (isDriver) {
    const Icon = ShieldCheck;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm animate-pulse-subtle">
        <Icon className="w-3.5 h-3.5" />
        Người điều khiển (Chính)
      </span>
    );
  }

  if (!role || !ROLE_INFO[role]) return null;

  const info = ROLE_INFO[role];
  const Icon = info.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${info.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {info.label}
    </span>
  );
}
