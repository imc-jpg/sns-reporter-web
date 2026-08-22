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
    <div className="card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <span className="text-slate-900 dark:text-slate-100" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
          {MONTH_NAMES[month]} {year}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.4rem' }}>
        {DAYS.map((d, i) => (
          <div key={d} className={`text-center text-[0.72rem] font-bold py-1 ${i === 0 ? 'text-red-500 dark:text-red-400' : i === 6 ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {fullCells.map((cell, idx) => {
          const events = cell.current ? getEventsForDay(cell.day) : [];
          const today_ = cell.current && isToday(cell.day);
          return (
            <div key={idx} style={{ padding: '0.25rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[0.82rem] ${
                today_ 
                  ? 'bg-[#003378] dark:bg-blue-600 text-white font-extrabold' 
                  : !cell.current 
                  ? 'text-slate-300 dark:text-slate-600 font-normal' 
                  : isSun(idx) 
                  ? 'text-red-500 dark:text-red-400 font-semibold' 
                  : isSat(idx) 
                  ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                  : 'text-slate-800 dark:text-slate-100 font-medium'
              }`}>
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
