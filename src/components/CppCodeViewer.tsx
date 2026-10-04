'use client';

import React, { useState } from 'react';
import { OFFICIAL_CPP_CODE, LINEAR_CPP_CODE } from '@/data/questions';
import { Code2, ChevronDown, ChevronUp } from 'lucide-react';

interface CppCodeViewerProps {
  defaultOpen?: boolean;
}

export default function CppCodeViewer({ defaultOpen = true }: CppCodeViewerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedAlgo, setSelectedAlgo] = useState<'binary' | 'linear'>('binary');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mb-6">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-sky-400" />
          <span className="font-mono text-sm font-semibold text-slate-200">Mã C++ chuẩn bài học:</span>
          <div className="flex rounded-md bg-slate-800 p-0.5 ml-2">
            <button
              onClick={() => setSelectedAlgo('binary')}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                selectedAlgo === 'binary'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              BinarySearch (Nhị phân)
            </button>
            <button
              onClick={() => setSelectedAlgo('linear')}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                selectedAlgo === 'linear'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LinearSearch (Tuần tự)
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-slate-200 p-1"
          title={isOpen ? 'Thu gọn' : 'Mở rộng'}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 overflow-x-auto text-xs md:text-sm font-mono text-slate-300 bg-slate-900/95 leading-relaxed">
          <pre>
            <code>{selectedAlgo === 'binary' ? OFFICIAL_CPP_CODE : LINEAR_CPP_CODE}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
