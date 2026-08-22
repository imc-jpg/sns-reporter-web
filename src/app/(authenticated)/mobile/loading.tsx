// /mobile 전용 로딩 화면 — 이전엔 (authenticated) 그룹 공용 loading.tsx(흰 배경 +
// PC 톤 파란 스피너)를 그대로 썼는데, 이 화면이 잠깐 보였다가 모바일 셸(#F4F5F7
// 배경, 네이비 톤)로 바뀌면서 눈에 띄는 색 전환이 있었다 — 이 라우트 세그먼트에
// 배경·색을 맞춘 로딩 화면을 따로 둬서 그 전환 자체를 없앤다(Next.js는 더 구체적인
// 세그먼트의 loading.tsx를 우선한다).
export default function MobileLoading() {
  return (
    <div className="w-full h-dvh flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#F4F5F7' }}>
      <div
        className="w-9 h-9 rounded-full"
        style={{
          border: '3px solid #C0CFE4',
          borderTopColor: '#003378',
          animation: 'mobile-loading-spin 0.8s linear infinite',
        }}
      />
      <div className="text-sm font-bold text-slate-500">콘텐츠를 불러오는 중입니다...</div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mobile-loading-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
