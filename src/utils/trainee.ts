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
  
  // 25기, 26기 등 수습기수 또는 '수습' 키워드가 포함되어 있는지 체크
  return (
    fullText.includes('25기') ||
    fullText.includes('26기') ||
    fullText.includes('수습')
  );
}
