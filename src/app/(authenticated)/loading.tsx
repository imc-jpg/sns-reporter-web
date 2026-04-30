export default function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #002454', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>데이터를 불러오는 중입니다...</div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
