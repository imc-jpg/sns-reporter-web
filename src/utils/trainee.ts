export function isTraineeContent(item: any): boolean {
  if (!item) return false;
  
  const authorName = item.author_name || '';
  const team = item.team || '';
  const title = item.title || '';
  const keywords = item.keywords || '';
  const parsedCrew = item.parsedCrew || '';
  const description = item.description || '';

  let crewString = parsedCrew;
  if (!crewString && item.content_body && typeof item.content_body === 'string' && item.content_body.startsWith('{')) {
    try {
      const bodyObj = JSON.parse(item.content_body);
      if (typeof bodyObj.crew === 'string') {
        crewString = bodyObj.crew;
      } else if (Array.isArray(bodyObj.crew)) {
        crewString = bodyObj.crew.map((c: any) => c.name || c).join(',');
      }
    } catch (e) {}
  }

  const fullText = `${authorName} ${team} ${title} ${keywords} ${crewString} ${description}`;
  
  // 25기 단원은 정단원으로 전환되어 기존 단원과 함께 전체 콘텐츠에 통합 표시됩니다.
  if (fullText.includes('25기') && !fullText.includes('26기') && !fullText.includes('27기')) {
    return false;
  }

  // 26기 이상 수습 기수 또는 (25기가 아닌) '수습' 키워드가 포함된 경우만 수습 단원 콘텐츠로 분류합니다.
  return (
    fullText.includes('26기') ||
    fullText.includes('27기') ||
    (fullText.includes('수습') && !fullText.includes('25기'))
  );
}
