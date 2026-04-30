'use client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function MonthCalendar({ year, month, contents }: { year: number; month: number; contents: any[] }) {
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const today = new Date();

  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  // Prev month tail
  const prevDays = getDaysInMonth(year, month - 1);
  const fullCells = cells.map((d, i) => {
    if (d !== null) return { day: d, current: true };
    if (i < firstDay) return { day: prevDays - firstDay + i + 1, current: false };
    return { day: i - firstDay - daysInMonth + 1, current: false };
  });

  const getEventsForDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const target = `${year}-${pad(month + 1)}-${pad(day)}`;
    return contents.filter(c => c.parsedPublishDate === target);
  };

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const isSun = (idx: number) => idx % 7 === 0;
  const isSat = (idx: number) => idx % 7 === 6;

  const dotColors = ['#003378', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
          {MONTH_NAMES[month]} {year}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.4rem' }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#94A3B8', padding: '0.2rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {fullCells.map((cell, idx) => {
          const events = cell.current ? getEventsForDay(cell.day) : [];
          const today_ = cell.current && isToday(cell.day);
          const textColor = !cell.current ? '#D1D5DB' : isSun(idx) ? '#EF4444' : isSat(idx) ? '#3B82F6' : '#1e293b';
          return (
            <div key={idx} style={{ padding: '0.25rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: today_ ? '#003378' : 'transparent',
                color: today_ ? 'white' : textColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.82rem', fontWeight: today_ ? 800 : 500,
              }}>
                {cell.day}
              </div>
              {events.length > 0 && (
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {events.slice(0, 3).map((_, i) => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColors[i % dotColors.length] }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardCalendar({ contents }: { contents: any[] }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const nextY = m === 11 ? y + 1 : y;
  const nextM = m === 11 ? 0 : m + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <MonthCalendar year={y} month={m} contents={contents} />
      <MonthCalendar year={nextY} month={nextM} contents={contents} />
    </div>
  );
}
