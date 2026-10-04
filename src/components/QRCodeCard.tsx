'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Download, Check, Wifi, Globe, Edit3 } from 'lucide-react';

interface QRCodeCardProps {
  roomCode: string;
}

export default function QRCodeCard({ roomCode }: QRCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [localIpUrl, setLocalIpUrl] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [isEditingHost, setIsEditingHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQr = async (host?: string) => {
    try {
      setLoading(true);
      const url = `/api/system/info?roomCode=${encodeURIComponent(roomCode)}${host ? `&customHost=${encodeURIComponent(host)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      if (data.joinUrl) setJoinUrl(data.joinUrl);
      if (data.localIpUrl) setLocalIpUrl(data.localIpUrl);
    } catch (err) {
      console.error('Lỗi tải mã QR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomCode) {
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : undefined;
      fetchQr(origin);
    }
  }, [roomCode]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Phong_${roomCode}_ThuThachTimKiem.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleApplyCustomHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (customHost.trim()) {
      fetchQr(customHost.trim());
      setIsEditingHost(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 flex flex-col items-center text-center">
      <div className="mb-2">
        <span className="text-xs uppercase tracking-wider font-bold text-sky-600 block">
          Quét QR hoặc nhập mã để vào phòng
        </span>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="text-3xl font-black tracking-widest text-slate-800 bg-slate-100 px-4 py-1 rounded-xl border border-slate-300 font-mono shadow-inner">
            {roomCode}
          </span>
        </div>
      </div>

      {/* Vùng hiển thị ảnh QR */}
      <div className="my-4 p-3 bg-white border-2 border-dashed border-sky-300 rounded-2xl shadow-sm relative group">
        {loading ? (
          <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
            Đang tạo mã QR...
          </div>
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`Mã QR phòng ${roomCode}`}
            className="w-52 h-52 object-contain rounded-xl"
          />
        ) : (
          <div className="w-52 h-52 flex items-center justify-center text-rose-500 text-xs">
            Không thể tạo mã QR
          </div>
        )}
      </div>

      {/* Thông tin URL thực tế */}
      <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-left space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-bold text-sky-800">
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            Đường dẫn QR trực tiếp:
          </span>
          <button
            onClick={() => setIsEditingHost(!isEditingHost)}
            className="text-sky-600 hover:text-sky-800 flex items-center gap-0.5 text-[11px]"
          >
            <Edit3 className="w-3 h-3" />
            Tùy chỉnh Host
          </button>
        </div>

        {isEditingHost ? (
          <form onSubmit={handleApplyCustomHost} className="flex gap-1.5 mt-1">
            <input
              type="text"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="VD: https://thu-thach-tim-kiem.onrender.com"
              className="flex-1 px-2 py-1 text-xs border rounded bg-white font-mono"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-sky-600 text-white rounded text-xs font-semibold"
            >
              Lưu
            </button>
          </form>
        ) : (
          <p className="font-mono text-xs text-sky-950 break-all select-all font-bold bg-white p-2 rounded border border-slate-200">
            {joinUrl}
          </p>
        )}

        <div className="text-[11px] text-slate-600 bg-sky-50/70 p-2 rounded border border-sky-100">
          💡 <strong>Cách vào dự phòng:</strong> Nếu học sinh không quét được QR, truy cập trang chủ chọn <strong>"Vào phòng chơi"</strong> hoặc mở <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-sky-800">/join</code> và nhập mã phòng: <strong className="font-mono text-sky-900 font-extrabold">{roomCode}</strong>.
        </div>
      </div>

      {/* Nút thao tác nhanh: Sao chép link & Tải ảnh về Canva */}
      <div className="flex flex-wrap gap-2 w-full justify-center">
        <button
          onClick={handleCopyLink}
          className="flex-1 min-w-[130px] px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              Đã sao chép!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-600" />
              Sao chép liên kết
            </>
          )}
        </button>

        <button
          onClick={handleDownloadQr}
          className="flex-1 min-w-[130px] px-3 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Tải QR đưa lên Canva
        </button>
      </div>
    </div>
  );
}
