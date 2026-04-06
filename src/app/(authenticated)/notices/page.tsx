export default function NoticesPage() {
  const mockNotices = [
    { id: 1, title: '[필독] 26년 4월 기사 주제 선정 안내', date: '2026-04-01', author: '관리자', isImportant: true },
    { id: 2, title: '캠퍼스 내 드론 촬영 관련 제한 구역 안내', date: '2026-03-28', author: '관리자', isImportant: false },
    { id: 3, title: '상반기 우수 기자단 시상식 일정', date: '2026-03-15', author: '단장 박서진', isImportant: false },
  ];

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>공지사항</h2>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: 500, width: '10%' }}>종류</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '60%' }}>제목</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>작성자</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>등록일</th>
            </tr>
          </thead>
          <tbody>
            {mockNotices.map((notice) => (
              <tr key={notice.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: notice.isImportant ? '#eff6ff' : 'white' }}>
                <td style={{ padding: '1rem' }}>
                  {notice.isImportant ? (
                    <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>중요</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>일반</span>
                  )}
                </td>
                <td style={{ padding: '1rem', fontWeight: notice.isImportant ? 600 : 400 }}>
                  <a href="#" style={{ cursor: 'pointer' }}>{notice.title}</a>
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{notice.author}</td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{notice.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 임시 등록 버튼 (실제 앱에서는 관리자에게만 보임) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button className="btn-primary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>공지 작성하기 (관리자용)</button>
      </div>
    </div>
  );
}
