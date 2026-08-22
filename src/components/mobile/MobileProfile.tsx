'use client';

import React from 'react';
import { cleanAuthorName } from '@/utils/dateUtils';

interface MobileProfileProps {
  user: any;
  onLogout?: () => void;
}

export default function MobileProfile({ user, onLogout }: MobileProfileProps) {
  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const userName = cleanAuthorName(rawName) || user?.email?.split('@')[0] || '기자';
  const userTeam = user?.user_metadata?.team || 'SNS기자단';
  const userEmail = user?.email || 'user@yonsei.ac.kr';

  return (
    <div className="space-y-4 pb-28 text-slate-900 select-none">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-br from-[#002454] to-blue-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full bg-white/20 p-1 backdrop-blur-xs flex-shrink-0">
            <img 
              src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=002454&color=fff`} 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
          <div>
            <h2 className="text-xl font-black">{userName} 님</h2>
            <div className="text-xs text-blue-200 font-bold">{userTeam}</div>
            <div className="text-xs text-blue-300/80 mt-0.5 font-medium">{userEmail}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs font-semibold relative z-10">
          <div className="flex-1 bg-white/10 p-3 rounded-xl text-center backdrop-blur-xs">
            <div className="text-xs text-blue-200 font-medium">소속</div>
            <div className="font-bold text-white text-sm mt-0.5">{userTeam}</div>
          </div>
          <div className="flex-1 bg-white/10 p-3 rounded-xl text-center backdrop-blur-xs">
            <div className="text-xs text-blue-200 font-medium">권한</div>
            <div className="font-bold text-white text-sm mt-0.5">SNS 기자단</div>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/20 rounded-full blur-xl" />
      </div>

      {/* PC 전환 — 예전엔 이 카드에 FAMILY SITES 바로가기(장비대여·유튜브·인스타그램)
          링크 3개가 함께 있었는데, 요청대로 그 섹션은 없애고 PC 전환 버튼만 남겼다. */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
        <button
          onClick={() => {
            localStorage.setItem('pref_view_mode', 'desktop');
            window.location.href = '/dashboard';
          }}
          className="w-full flex items-center justify-between p-3.5 rounded-xl hover-fine:bg-blue-50 text-sm font-bold text-blue-900 transition-colors border border-blue-100"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">💻</span>
            <span>PC 데스크톱 화면으로 전환</span>
          </div>
          <span className="text-blue-600 font-bold">›</span>
        </button>
      </div>

      {/* Logout Action */}
      {onLogout && (
        <div className="pt-2">
          <button
            onClick={onLogout}
            className="w-full py-3.5 bg-red-50 text-red-600 font-bold text-sm rounded-2xl hover-fine:bg-red-100 transition-colors border border-red-100 shadow-xs"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
