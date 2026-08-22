'use client';

import { useState } from 'react';
import { 
  InstagramIcon, 
  YoutubeIcon, 
  NaverBlogIcon 
} from '@/components/platformIcons';

type TabType = 'workflow' | 'platforms' | 'brand' | 'planning' | 'copyright';

export default function GuidelinesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workflow');
  const [activePlatform, setActivePlatform] = useState<'instagram_card' | 'reels_shorts' | 'youtube_long' | 'naver_blog'>('instagram_card');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-24 px-2 sm:px-4">
      
      {/* 1. Header Banner */}
      <header className="bg-[#002454] rounded-2xl p-6 sm:p-10 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-bold tracking-wide">
              연세대학교 미디어센터
            </span>
            <span className="text-xs text-blue-200 font-medium">
              공식 실무 제작 매뉴얼
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight m-0">
              SNS 기자단 콘텐츠 제작 가이드라인
            </h1>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-3xl m-0">
              연세대학교 공식 SNS 채널의 브랜드 일관성과 완성도 높은 기사 제작을 위한 5단계 제작 프로세스, 플랫폼별 규격, 공식 비주얼 에셋 및 저작권 수칙입니다.
            </p>
          </div>
        </div>
      </header>

      {/* 2. Main Tab Navigation */}
      <nav 
        role="tablist"
        aria-label="가이드라인 탭 메뉴"
        className="bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5"
      >
        {[
          { id: 'workflow', label: '1. 제작 프로세스', sub: '기획 ➔ 승인 ➔ 발행' },
          { id: 'platforms', label: '2. 플랫폼별 규격', sub: '카드뉴스·릴스·유튜브' },
          { id: 'brand', label: '3. 브랜드 & 비주얼', sub: '공식 컬러 및 서체' },
          { id: 'planning', label: '4. 기획 & 취재 섭외', sub: '소재 발굴·DM 양식' },
          { id: 'copyright', label: '5. 저작권 & 초상권', sub: '라이선스·동의서' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`text-left p-3.5 rounded-xl transition-all flex flex-col justify-between cursor-pointer ${
                isActive 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-xs sm:text-sm font-bold tracking-tight">
                {tab.label}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal truncate">
                {tab.sub}
              </div>
            </button>
          );
        })}
      </nav>

      {/* ===================== TAB 1: 제작 프로세스 ===================== */}
      {activeTab === 'workflow' && (
        <section 
          id="panel-workflow" 
          role="tabpanel" 
          aria-labelledby="tab-workflow"
          className="flex flex-col gap-6"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 m-0">
                  콘텐츠 제작 및 승인 5단계 프로세스
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 m-0">
                  모든 콘텐츠는 기획안 승인 및 완성본 검수 과정을 거쳐 공식 채널에 업로드됩니다.
                </p>
              </div>
            </div>

            {/* Step List */}
            <ol className="grid grid-cols-1 md:grid-cols-5 gap-4 list-none p-0 m-0">
              {[
                { 
                  step: '1', 
                  title: '기획안 작성', 
                  tag: '기자 작성', 
                  desc: '주제, 기획의도, 플랫폼, 참여 크루, 희망 일정을 대시보드에 등록합니다.' 
                },
                { 
                  step: '2', 
                  title: '기획안 검토', 
                  tag: '미디어센터', 
                  desc: '아이템 중복 및 시의성을 검토하여 승인 또는 보완 피드백을 전달합니다.' 
                },
                { 
                  step: '3', 
                  title: '취재 및 제작', 
                  tag: '현장 취재', 
                  desc: '승인된 기획안을 바탕으로 현장 촬영, 인터뷰 섭외 및 편집을 진행합니다.' 
                },
                { 
                  step: '4', 
                  title: '완성본 제출', 
                  tag: '최종본 등록', 
                  desc: '완성된 작업물 링크(구글 드라이브)와 캡션 본문을 대시보드에 등록합니다.' 
                },
                { 
                  step: '5', 
                  title: '최종 검수·발행', 
                  tag: '공식 업로드', 
                  desc: '최종 검수를 거쳐 공식 SNS 채널에 송출되며 상태가 완료로 변경됩니다.' 
                },
              ].map((s) => (
                <li 
                  key={s.step} 
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-6 h-6 rounded-full bg-[#002454] text-white flex items-center justify-center text-xs font-bold">
                        {s.step}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {s.tag}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      {s.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                      {s.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Key Directives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                  필수 준수
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  사전 승인 없는 자체 업로드 금지
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                모든 콘텐츠는 <strong>기획안 승인 ➔ 완성본 검수</strong>의 2단계 피드백을 필수로 거칩니다. 승인 절차를 거치지 않은 콘텐츠는 공식 채널에 게재할 수 없습니다.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  긴급 승인
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  시의성 긴급 콘텐츠 패스트트랙
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                행사, 속보, 축제 등 시의성이 중요한 콘텐츠는 정기 마감일과 무관하게 미디어센터 담당자와 즉시 소통하여 신속 검토 후 취재를 진행할 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 2: 플랫폼별 규격 ===================== */}
      {activeTab === 'platforms' && (
        <section 
          id="panel-platforms" 
          role="tabpanel" 
          aria-labelledby="tab-platforms"
          className="flex flex-col gap-6"
        >
          {/* Sub Platform Selector */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'instagram_card', label: '인스타그램 카드뉴스 (4:5)', icon: <InstagramIcon className="w-4 h-4" /> },
              { id: 'reels_shorts', label: '릴스 / 숏폼 (9:16)', icon: <InstagramIcon className="w-4 h-4" /> },
              { id: 'youtube_long', label: '유튜브 롱폼 & 썸네일 (16:9)', icon: <YoutubeIcon className="w-4 h-4" /> },
              { id: 'naver_blog', label: '네이버 블로그 (1:1 & 본문)', icon: <NaverBlogIcon className="w-4 h-4" /> },
            ].map(p => {
              const isSelected = activePlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePlatform(p.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-[#002454] text-white shadow-xs' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Platform 1: Instagram Card News */}
          {activePlatform === 'instagram_card' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Specs Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  카드뉴스 제작 표준 규격
                </h3>
                <div className="flex flex-col gap-3 text-xs sm:text-sm">
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">권장 해상도</span>
                    <strong className="text-slate-900 dark:text-slate-100">1080 × 1350 px (4:5 비율)</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">슬라이드 장수</span>
                    <strong className="text-slate-900 dark:text-slate-100">6 ~ 10장 (표지 포함)</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">파일 형식</span>
                    <strong className="text-slate-900 dark:text-slate-100">PNG 또는 고화질 JPG</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">외곽 안전 여백</span>
                    <strong className="text-slate-900 dark:text-slate-100">상하좌우 최소 60px</strong>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500 font-medium">해시태그</span>
                    <strong className="text-slate-900 dark:text-slate-100">핵심 키워드 3 ~ 5개 권장</strong>
                  </div>
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  카드뉴스 제작 핵심 수칙
                </h3>
                <ul className="flex flex-col gap-3 list-none p-0 m-0 text-xs sm:text-sm">
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      1. 표지 후킹(Hooking) 타이틀
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      표지는 한눈에 들어오는 3줄 이내의 핵심 문구로 구성하며, 텍스트 면적이 전체의 40%를 넘지 않도록 여백을 확보합니다.
                    </span>
                  </li>
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      2. 슬라이드당 정보 분량 압축
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      모바일 환경에서는 긴 줄글보다 핵심 문장 1~2개와 시각 자료(사진, 아이콘)를 조합하여 가독성을 높입니다.
                    </span>
                  </li>
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      3. 마지막 장 행동 유도(CTA)
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      엔딩 슬라이드에는 게시물 '저장(Save)' 및 '친구에게 공유'를 유도하는 마무리 멘트를 포함합니다.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Platform 2: Reels & Shorts */}
          {activePlatform === 'reels_shorts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Specs Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  숏폼(릴스·쇼츠) 제작 표준 규격
                </h3>
                <div className="flex flex-col gap-3 text-xs sm:text-sm">
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">해상도 및 프레임</span>
                    <strong className="text-slate-900 dark:text-slate-100">1080 × 1920 px (9:16 / 60fps)</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">권장 영상 길이</span>
                    <strong className="text-slate-900 dark:text-slate-100">30초 ~ 50초 내외</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">파일 형식</span>
                    <strong className="text-slate-900 dark:text-slate-100">MP4 (H.264 코덱)</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">자막 안전 영역</span>
                    <strong className="text-slate-900 dark:text-slate-100">화면 높이 기준 40% ~ 60% 중앙 구간</strong>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500 font-medium">오디오</span>
                    <strong className="text-slate-900 dark:text-slate-100">자체 마스터링 완료된 믹싱 음원</strong>
                  </div>
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  숏폼 영상 핵심 수칙
                </h3>
                <ul className="flex flex-col gap-3 list-none p-0 m-0 text-xs sm:text-sm">
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      1. 첫 2초 시선 고정
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      영상 시작 즉시 질문이나 핵심 장면을 배치하여 스크롤 이탈을 방지하고 시청 지속시간을 확보합니다.
                    </span>
                  </li>
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      2. 하단 UI 가림 영역 고려
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      화면 하단 25%는 계정명과 캡션 글씨가 덮으므로, 주요 자막과 피사체는 반드시 화면 중앙부에 배치합니다.
                    </span>
                  </li>
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      3. 오디오 싱크 밀림 방지
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      나레이션, 효과음, 배경음악(BGM)을 편집 툴에서 완벽히 믹싱한 단일 MP4 파일로 제출합니다.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Platform 3: YouTube Long-form */}
          {activePlatform === 'youtube_long' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Specs Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  유튜브 롱폼 및 썸네일 규격
                </h3>
                <div className="flex flex-col gap-3 text-xs sm:text-sm">
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">영상 해상도</span>
                    <strong className="text-slate-900 dark:text-slate-100">1920 × 1080 (FHD) 또는 4K</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">썸네일 규격</span>
                    <strong className="text-slate-900 dark:text-slate-100">1280 × 720 px (16:9 / 2MB 이하)</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">권장 영상 길이</span>
                    <strong className="text-slate-900 dark:text-slate-100">3분 ~ 8분 내외</strong>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500 font-medium">썸네일 주의구역</span>
                    <strong className="text-slate-900 dark:text-slate-100">우측 하단 타임코드(재생시간) 영역</strong>
                  </div>
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  유튜브 제작 핵심 수칙
                </h3>
                <ul className="flex flex-col gap-3 list-none p-0 m-0 text-xs sm:text-sm">
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      1. 썸네일 우측 하단 타임코드 회피
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      유튜브 UI에서 우측 하단은 영상 길이(예: 08:24)가 표시되므로 주요 인물이나 핵심 글자를 배치하지 않습니다.
                    </span>
                  </li>
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      2. 미디어센터 공식 소스 라이브러리 활용
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      고품질 자막 템플릿, 음원, 트랜지션 소스를 위해 미디어센터가 지원하는 상업용 라이브러리 계정을 활용합니다.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Platform 4: Naver Blog */}
          {activePlatform === 'naver_blog' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Specs Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  네이버 블로그 기사 규격
                </h3>
                <div className="flex flex-col gap-3 text-xs sm:text-sm">
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">대표 썸네일</span>
                    <strong className="text-slate-900 dark:text-slate-100">1000 × 1000 px (1:1 정사각형)</strong>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">권장 본문 분량</span>
                    <strong className="text-slate-900 dark:text-slate-100">공백 포함 2,000자 ~ 3,500자</strong>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500 font-medium">사진 첨부</span>
                    <strong className="text-slate-900 dark:text-slate-100">직접 촬영한 고해상도 사진 12장 이상</strong>
                  </div>
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                  블로그 검색 최적화 수칙
                </h3>
                <ul className="flex flex-col gap-3 list-none p-0 m-0 text-xs sm:text-sm">
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      1. 핵심 검색 키워드 자연스러운 반복
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      제목 및 본문 소제목에 학우들이 실제 검색하는 키워드(예: 연세대학교, 수강신청 팁, 백양로 맛집 등)를 자연스럽게 포함합니다.
                    </span>
                  </li>
                  <li className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold mb-1">
                      2. 직접 촬영한 원본 사진 사용
                    </strong>
                    <span className="text-slate-600 dark:text-slate-400">
                      외부 캡처 이미지 대신 기자가 직접 촬영한 원본 사진을 문단 사이에 균형 있게 배치하여 체류 시간을 늘립니다.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================== TAB 3: 브랜드 & 비주얼 ===================== */}
      {activeTab === 'brand' && (
        <section 
          id="panel-brand" 
          role="tabpanel" 
          aria-labelledby="tab-brand"
          className="flex flex-col gap-6"
        >
          {/* Color Palette Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 m-0">
                연세대학교 공식 브랜드 컬러
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 m-0">
                카드를 클릭하면 디자인 툴에서 바로 사용할 수 있는 HEX 코드가 복사됩니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Yonsei Deep Blue', desc: '공식 메인 로고 및 헤더', hex: '#002454', bgClass: 'bg-[#002454]', textClass: 'text-white' },
                { name: 'Yonsei Royal Blue', desc: '강조 그래픽 및 뱃지', hex: '#1E3A8A', bgClass: 'bg-[#1E3A8A]', textClass: 'text-white' },
                { name: 'Yonsei Point Blue', desc: '하이라이트 및 버튼', hex: '#2563EB', bgClass: 'bg-[#2563EB]', textClass: 'text-white' },
                { name: 'Yonsei Soft Blue', desc: '배경 서피스 및 태그', hex: '#EAF2FF', bgClass: 'bg-[#EAF2FF]', textClass: 'text-[#002454]' },
              ].map(c => (
                <div
                  key={c.hex}
                  onClick={() => copyToClipboard(c.hex, c.name)}
                  className={`${c.bgClass} ${c.textClass} rounded-xl p-5 flex flex-col justify-between min-h-[140px] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{c.name}</span>
                    <span className="text-[11px] opacity-80">
                      {copiedText === c.name ? '✓ 복사됨' : '클릭 복사'}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-black tracking-wider tabular-nums">
                      {c.hex}
                    </div>
                    <div className="text-[11px] opacity-75 mt-1">
                      {c.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography Guide */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              공식 권장 무료 상업용 서체 (OFL)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    타이틀·헤드라인용
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 my-2">
                    Pretendard / Gmarket Sans
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                    볼드 웨이트의 두께감이 뛰어나 표지 타이틀과 주요 강조 문구에 적합합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>추천 웨이트: <strong>Bold (700) / Black (900)</strong></span>
                  <span>OFL 라이선스</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    본문·자막용
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 my-2">
                    KoPubWorld 돋움 / Noto Sans KR
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                    긴 글이나 영상 자막에서도 뭉개짐 없이 깨끗한 가독성을 유지합니다.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>추천 웨이트: <strong>Medium (500) / SemiBold (600)</strong></span>
                  <span>OFL 라이선스</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 4: 기획 & 취재 섭외 ===================== */}
      {activeTab === 'planning' && (
        <section 
          id="panel-planning" 
          role="tabpanel" 
          aria-labelledby="tab-planning"
          className="flex flex-col gap-6"
        >
          {/* Editorial Checklist */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              소재 발굴 및 기획 점검 3원칙
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1. 흥미와 동기</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 my-2">취재 의도가 명확한가?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                  독자에게 전달하고자 하는 핵심 메시지와 기획 의도가 명확히 서 있는 주제인지 점검합니다.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">2. 취재 가능성</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 my-2">현실적인 섭외가 가능한가?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                  인터뷰이 섭외 및 촬영 장소 협조가 마감 일정(D-Day) 내에 원활히 가능한지 확인합니다.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">3. 유용성과 공감대</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 my-2">학우들에게 실질적인 도움이 되는가?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                  학우들이 '저장'하거나 친구에게 '공유'할 만한 실용적 팁이나 따뜻한 공감대가 포함되어 있는지 확인합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Official Casting DM Template */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                  공식 취재 및 인터뷰 섭외 DM 양식
                </h3>
                <p className="text-slate-500 text-xs mt-1 m-0">
                  인터뷰이에게 신뢰감을 전달할 수 있는 표준 섭외 양식입니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(
                  `안녕하세요, 연세대학교 공식 SNS 기자단 OOO 기자입니다!\n\n이번에 [기획 주제: 예) 연세인 인터뷰] 콘텐츠를 준비하던 중 학우님의 멋진 활동을 접하게 되어 공식 채널을 통해 소개해 드리고자 연락드렸습니다.\n\n- 소요 시간: 약 20~30분 내외 (서면/대면 협의 가능)\n- 혜택: 연세대학교 공식 인스타그램/유튜브 소개 및 소정의 기념품\n\n부담 없이 편하게 답변 주시면 감사하겠습니다. 늘 응원합니다! 😊`,
                  'DM Template'
                )}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#002454] hover:bg-blue-900 text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors shadow-2xs"
              >
                {copiedText === 'DM Template' ? '✓ 복사되었습니다' : '📋 섭외 양식 복사하기'}
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
{`안녕하세요, 연세대학교 공식 SNS 기자단 OOO 기자입니다!

이번에 [기획 주제: 예) 연세인 인터뷰] 콘텐츠를 준비하던 중 학우님의 멋진 활동을 접하게 되어 공식 채널을 통해 소개해 드리고자 연락드렸습니다.

- 소요 시간: 약 20~30분 내외 (서면/대면 협의 가능)
- 혜택: 연세대학교 공식 인스타그램/유튜브 소개 및 소정의 기념품

부담 없이 편하게 답변 주시면 감사하겠습니다. 늘 응원합니다! 😊`}
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 5: 저작권 & 초상권 ===================== */}
      {activeTab === 'copyright' && (
        <section 
          id="panel-copyright" 
          role="tabpanel" 
          aria-labelledby="tab-copyright"
          className="flex flex-col gap-6"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              저작권 및 초상권 준수 수칙
            </h2>

            <div className="flex flex-col gap-4">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  1. 초상권 및 촬영 사전 동의 (필수)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                  얼굴이 노출되는 인터뷰 대상자에게는 반드시 <strong>'촬영 및 공식 채널 게시 동의'</strong>를 구두 또는 서면으로 확인해야 합니다. 캠퍼스 스케치 촬영 시 식별 가능한 일반 행인의 얼굴은 블러(모자이크) 처리가 필수입니다.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  2. 상업용 폰트 및 BGM 라이선스 확인
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                  개인용 무료 폰트나 음원이라도 공식 대학 채널(50만 규모) 게재 시 라이선스 위반이 발생할 수 있습니다. 반드시 <strong>OFL 서체</strong> 또는 미디어센터가 구독 중인 공식 라이브러리 음원만을 사용해야 합니다.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  3. 인용 자료 및 통계 출처 명시
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                  외부 뉴스, 학술 자료, 통계 데이터를 인용할 때는 슬라이드 또는 본문 하단에 <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">[출처: OOO 통계 2026]</code> 형식으로 명확히 출처를 기재합니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
