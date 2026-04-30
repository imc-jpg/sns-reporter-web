'use client';

import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [proposalDeadline, setProposalDeadline] = useState('');
  const [finalDeadline, setFinalDeadline] = useState('');
  const [proposalLabel, setProposalLabel] = useState('');
  const [finalLabel, setFinalLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/deadlines').then(r => r.json()).then(d => {
      setProposalDeadline(d.proposalDeadline || '');
      setFinalDeadline(d.finalDeadline || '');
      setProposalLabel(d.proposalLabel || '기획안 마감');
      setFinalLabel(d.finalLabel || '완성본 마감');
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalDeadline, finalDeadline, proposalLabel, finalLabel }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fieldStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1.5px solid #E2E8F0',
    fontSize: '0.95rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle = { fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', display: 'block' as const };

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>관리자 설정</h2>
      <p style={{ color: '#64748B', marginBottom: '2rem', fontSize: '0.95rem' }}>대시보드에 표시될 마감일 D-Day를 설정합니다.</p>

      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem', color: '#1e293b', borderBottom: '2px solid #E6EBF2', paddingBottom: '0.6rem' }}>
            📝 기획안 마감
          </h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>마감 날짜</label>
              <input
                type="date"
                value={proposalDeadline}
                onChange={e => setProposalDeadline(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>표시 라벨 (예: 기획안 마감)</label>
              <input
                type="text"
                placeholder="기획안 마감"
                value={proposalLabel}
                onChange={e => setProposalLabel(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem', color: '#1e293b', borderBottom: '2px solid #E6EBF2', paddingBottom: '0.6rem' }}>
            🎬 완성본 마감
          </h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>마감 날짜</label>
              <input
                type="date"
                value={finalDeadline}
                onChange={e => setFinalDeadline(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>표시 라벨 (예: 완성본 마감)</label>
              <input
                type="text"
                placeholder="완성본 마감"
                value={finalLabel}
                onChange={e => setFinalLabel(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          {saved && (
            <span style={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ✓ 저장 완료!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#003378',
              color: 'white',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
