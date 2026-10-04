'use client';

import React from 'react';
import { AvatarId } from '@/types';

export interface AvatarOption {
  id: AvatarId;
  name: string;
  emoji: string;
  bg: string;
}

export const AVATARS: AvatarOption[] = [
  { id: 'cat', name: 'Mèo con', emoji: '🐱', bg: 'bg-amber-100/80 border-amber-300' },
  { id: 'bear', name: 'Gấu nâu', emoji: '🐻', bg: 'bg-orange-100/80 border-orange-300' },
  { id: 'rabbit', name: 'Thỏ trắng', emoji: '🐰', bg: 'bg-pink-100/80 border-pink-300' },
  { id: 'fox', name: 'Cáo lửa', emoji: '🦊', bg: 'bg-red-100/80 border-red-300' },
  { id: 'penguin', name: 'Cánh cụt', emoji: '🐧', bg: 'bg-sky-100/80 border-sky-300' },
  { id: 'dino', name: 'Khủng long', emoji: '🦖', bg: 'bg-emerald-100/80 border-emerald-300' },
  { id: 'panda', name: 'Gấu trúc', emoji: '🐼', bg: 'bg-slate-200/80 border-slate-300' },
  { id: 'lion', name: 'Sư tử', emoji: '🦁', bg: 'bg-yellow-100/80 border-yellow-300' },
  { id: 'dog', name: 'Cún cưng', emoji: '🐶', bg: 'bg-amber-100/80 border-amber-300' },
  { id: 'koala', name: 'Koala', emoji: '🐨', bg: 'bg-teal-100/80 border-teal-300' },
  { id: 'frog', name: 'Ếch cốm', emoji: '🐸', bg: 'bg-lime-100/80 border-lime-300' },
  { id: 'unicorn', name: 'Kỳ lân', emoji: '🦄', bg: 'bg-purple-100/80 border-purple-300' },
];

export function getAvatarInfo(id?: string): AvatarOption {
  const found = AVATARS.find(a => a.id === id);
  return found || AVATARS[0];
}

interface AvatarPickerProps {
  selected: AvatarId;
  onSelect: (id: AvatarId) => void;
}

export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
      {AVATARS.map((av) => {
        const isChosen = selected === av.id;
        return (
          <button
            key={av.id}
            type="button"
            onClick={() => onSelect(av.id)}
            className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${av.bg} ${
              isChosen
                ? 'ring-4 ring-sky-400 scale-105 shadow-md border-sky-500 font-bold'
                : 'hover:scale-102 hover:shadow-xs border-transparent opacity-80 hover:opacity-100'
            }`}
          >
            <span className="text-3xl sm:text-4xl filter drop-shadow-sm leading-none">
              {av.emoji}
            </span>
            <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
              {av.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
