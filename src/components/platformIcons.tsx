'use client';

import React from 'react';

// 유튜브 공식 로고
export const YoutubeIcon = ({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24">
    <rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0000" />
    <path d="M10 8.3v7.4l6.4-3.7z" fill="var(--platform-glyph, var(--m-platform-glyph, #ffffff))" />
  </svg>
);

// 인스타그램 공식 스퀘어 로고
export const InstagramIcon = ({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#FCAF45" />
    <rect x="6.3" y="6.3" width="11.4" height="11.4" rx="3.6" fill="none" stroke="var(--platform-glyph, var(--m-platform-glyph, #ffffff))" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3.1" fill="none" stroke="var(--platform-glyph, var(--m-platform-glyph, #ffffff))" strokeWidth="1.8" />
    <circle cx="16.4" cy="7.6" r="1.05" fill="var(--platform-glyph, var(--m-platform-glyph, #ffffff))" />
  </svg>
);

// 네이버블로그 공식 벡터 로고
export const NaverBlogIcon = ({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#03C75A" />
    <svg x="4.5" y="4" width="15" height="16" viewBox="0 0 1011 1114" preserveAspectRatio="xMidYMid meet">
      <path d="M2.06299 80.5728C19.0383 79.9653 38.9038 80.5179 56.0541 80.5401C94.7316 80.7479 133.41 80.5939 172.085 80.0781C175.695 183.198 171.748 288.596 172.317 391.938C172.337 395.656 171.635 398.949 172.662 402.605C178.128 402.148 185.442 392.38 189.581 388.468C229.301 350.924 290.43 334.301 343.163 325.621C355.92 323.521 371.743 324.534 384.918 324.386C424.18 323.947 462.937 330.35 499.809 343.943C537.921 356.907 554.127 363.097 586.508 388.27C665.715 449.845 706.035 534.349 715.797 633.433C721.909 695.476 717.776 762.746 698.225 822.789C690.512 846.477 671.333 880.945 657.989 902.049C651.832 911.794 636.413 930.283 628.507 940.26C593.075 976.626 545.496 1008.78 497.259 1024.68C382.85 1062.36 253.672 1051.07 163.292 967.239C164.562 985.591 166.714 1015.49 163.465 1032.85C149.689 1034.67 5.72213 1034.53 1.0468 1031.85C-0.642703 1021.53 0.214654 980.623 0.238385 968.547L0.30483 839.274L0.31453 339.724L0.301876 173.708C0.303564 162.009 -0.70862 85.804 2.06299 80.5728ZM381.958 888.306C423.633 883.697 447.023 873.709 478.716 846.066C503.518 827.345 514.414 806.99 527.269 779.431C546.2 738.851 550.143 695.481 544.933 651.037C538.689 597.762 508.641 541.218 464.512 509.645C428.904 484.168 378.836 476.187 336.272 479.52C207.083 495.468 157.493 600.946 169.823 720.053C181.112 829.096 273.017 902.27 381.958 888.306Z" fill="var(--platform-glyph, var(--m-platform-glyph, #ffffff))" />
      <path d="M940.976 0.643002C946.043 0.039721 951.134 0.088241 956.227 0.166288C973.957 0.439452 991.73 -0.424325 1009.45 0.290753C1011.36 11.8385 1009.55 57.5961 1009.54 73.0326L1009.65 251.014L1009.63 906.774L1009.65 1048.57C1009.69 1059.83 1011.93 1105.56 1009.17 1112.49C1003.01 1113.52 943.761 1113.34 940.621 1110.28C938.844 1100.41 939.751 1047.04 939.764 1034.19L939.847 861.591L939.821 214.648C939.821 188.004 937.793 8.0005 940.976 0.643002Z" fill="var(--platform-glyph, var(--m-platform-glyph, #ffffff))" />
    </svg>
  </svg>
);

export const GenericPostIcon = ({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h13l3 3v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <path d="M8 12h8M8 16h5" />
  </svg>
);
