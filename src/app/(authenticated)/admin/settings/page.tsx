'use client';

import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [proposalDeadline, setProposalDeadline] = useState('');
  const [finalDeadline, setFinalDeadline] = useState('');
  const [proposalLabel, setProposalLabel] = useState('');
  const [finalLabel, setFinalLabel] = useState('');
  const [proposalSubLabel, setProposalSubLabel] = useState('');
  const [finalSubLabel, setFinalSubLabel] = useState('');
  const [teamQuotas, setTeamQuotas] = useState<{ team: string; quota: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/deadlines').then(r => r.json()).then(d => {
      setProposalDeadline(d.proposalDeadline || '');
      setFinalDeadline(d.finalDeadline || '');
      setProposalLabel(d.proposalLabel || '기획안 마감');
      setFinalLabel(d.finalLabel || '완성본 마감');
      setProposalSubLabel(d.proposalSubLabel || '26-1분기 (5월 콘텐츠)');
      setFinalSubLabel(d.finalSubLabel || '26-1분기 (5월 콘텐츠)');
      const quotaObj = d.teamQuotas || {};
      setTeamQuotas(Object.keys(quotaObj).map(team => ({ team, quota: Number(quotaObj[team]) || 0 })));
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const teamQuotasObj: Record<string, number> = {};
    teamQuotas.forEach(({ team, quota }) => {
      if (team.trim()) teamQuotasObj[team.trim()] = quota;
    });
    await fetch('/api/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalDeadline, finalDeadline, proposalLabel, finalLabel, proposalSubLabel, finalSubLabel, teamQuotas: teamQuotasObj }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fieldStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--input-glass-bg)',
    color: 'var(--color-text-main)',
    fontSize: '0.9rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
  } as React.CSSProperties;

  const labelStyle = { fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)' as string, marginBottom: '0.4rem', display: 'block' as const };

  return (
    <div className="animate-enter" style={{ maxWidth: '640px', paddingBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-heading)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>관리자 설정</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.75rem', fontSize: '0.88rem' }}>대시보드에 표시될 마감일 D-Day를 설정합니다.</p>

      <div className="card motion-card" style={{ borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--color-text-heading)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.6rem' }}>
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
          <div style={{ marginTop: '1rem' }}>
            <label style={labelStyle}>부제목 (예: 26-1분기 (5월 콘텐츠))</label>
            <input
              type="text"
              placeholder="26-1분기 (5월 콘텐츠)"
              value={proposalSubLabel}
              onChange={e => setProposalSubLabel(e.target.value)}
              style={fieldStyle}
            />
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--color-text-heading)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.6rem' }}>
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
          <div style={{ marginTop: '1rem' }}>
            <label style={labelStyle}>부제목 (예: 26-1분기 (5월 콘텐츠))</label>
            <input
              type="text"
              placeholder="26-1분기 (5월 콘텐츠)"
              value={finalSubLabel}
              onChange={e => setFinalSubLabel(e.target.value)}
              style={fieldStyle}
            />
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--color-text-heading)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.6rem' }}>
            📊 기획안 분량 (팀별 제출 개수)
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            팀별로 이번 분기 마감까지 채워야 하는 기획안 제출 개수를 설정합니다. 사용자가 본인 팀의 목표 개수를 채우면 마감일 D-Day 대신 완료 상태로 표시됩니다.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {teamQuotas.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="팀 이름 (예: 유튜브)"
                  value={row.team}
                  onChange={e => setTeamQuotas(prev => prev.map((r, idx) => idx === i ? { ...r, team: e.target.value } : r))}
                  style={{ ...fieldStyle, flex: 2 }}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="목표 개수"
                  value={row.quota}
                  onChange={e => setTeamQuotas(prev => prev.map((r, idx) => idx === i ? { ...r, quota: Number(e.target.value) || 0 } : r))}
                  style={{ ...fieldStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setTeamQuotas(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontWeight: 700, cursor: 'pointer' }}
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTeamQuotas(prev => [...prev, { team: '', quota: 1 }])}
              style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1.5px dashed var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-muted)', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              + 팀 추가
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', alignItems: 'center' }}>
          {saved && (
            <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ✓ 저장 완료!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="motion-btn"
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#002454',
              color: 'white',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(0, 36, 84, 0.15)'
            }}
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
