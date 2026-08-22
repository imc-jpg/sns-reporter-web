export default function ResourcesPage() {
  const mockResources = [
    { id: 1, title: '연세대학교 공식 로고 (.ai, .png)', format: 'ZIP', size: '15.2 MB', date: '2026-03-01' },
    { id: 2, title: '26학년도 SNS기자단 인스타그램 카드뉴스 템플릿', format: 'PSD', size: '48.5 MB', date: '2026-03-02' },
    { id: 3, title: '자막 및 스크롤 프리셋 소스 (프리미어 프로)', format: 'PRPROJ', size: '2.1 MB', date: '2026-03-10' },
    { id: 4, title: '동의서 양식 (인터뷰 촬영 대상자용)', format: 'HWP', size: '14 KB', date: '2026-02-15' },
  ];

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'ZIP': return '#F59E0B';
      case 'PSD': return '#3B82F6';
      case 'PRPROJ': return '#8B5CF6';
      case 'HWP': return '#0EA5E9';
      default: return '#94A3B8';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* 프로스티드 글래스 잠금 오버레이 */}
      <div className="lock-overlay" style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '24px',
      }}>
        <div style={{ 
          backgroundColor: 'var(--color-surface)', 
          backdropFilter: 'blur(10px)',
          padding: '1.75rem', 
          borderRadius: '50%', 
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--color-border)'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-heading)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>자료실 준비 중</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>아직 자료실 기능을 사용할 수 없습니다.</p>
      </div>

      <div className="flex flex-col gap-6" style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>자료실</h2>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '4px 0 0 0' }}>기자단 활동에 필요한 양식 및 소스 자료를 다운로드 하세요.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {mockResources.map((resource) => (
            <div key={resource.id} className="card motion-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  backgroundColor: getFormatColor(resource.format), 
                  color: 'white', 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  fontSize: '0.72rem', 
                  fontWeight: 800,
                  letterSpacing: '0.04em'
                }}>
                  {resource.format}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>{resource.date}</span>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.4, margin: '0 0 0.4rem 0', color: '#0F172A', letterSpacing: '-0.01em' }}>{resource.title}</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>용량: {resource.size}</p>
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(226, 232, 240, 0.7)', textAlign: 'right' }}>
                <button style={{ color: '#002454', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  다운로드
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
