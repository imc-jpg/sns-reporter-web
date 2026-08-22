'use client';

import { useEffect } from 'react';

// /mobile 전용 에러 화면 — 예전엔 이 라우트에만 error.tsx가 없어서 서버 쿼리가
// 실패하면(네트워크 문제 등) Next.js 기본 에러 화면(이 앱과 무관한 스타일)이
// 그대로 노출됐다. 이 앱의 모바일 셸과 같은 배경/네이비 톤으로 맞추고, 다시
// 시도할 수 있는 버튼을 준다.
export default function MobileError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="w-full h-dvh flex items-center justify-center px-6"
      style={{ backgroundColor: '#F4F5F7' }}
    >
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="text-4xl">⚠️</div>
        <div className="space-y-1.5">
          <h1 className="text-base font-black text-slate-900">문제가 발생했습니다</h1>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            콘텐츠를 불러오는 중 오류가 발생했습니다.<br />잠시 후 다시 시도해 주세요.
          </p>
        </div>
        <button
          onClick={reset}
          className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white active:scale-95 transition-transform cursor-pointer"
          style={{ backgroundColor: '#003378' }}
        >
          다시 시도하기
        </button>
      </div>
    </div>
  );
}
