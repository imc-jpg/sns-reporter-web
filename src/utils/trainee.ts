export function isTraineeContent(item: any): boolean {
  if (!item) return false;
  
  const authorName = item.author_name || '';
  const team = item.team || '';
  const title = item.title || '';
  const keywords = item.keywords || '';
  const parsedCrew = item.parsedCrew || '';
  const description = item.description || '';

  const fullText = `${authorName} ${team} ${title} ${keywords} ${parsedCrew} ${description}`;
  
  // 25기, 26기 등 수습기수 또는 '수습' 키워드가 포함되어 있는지 체크
  return (
    fullText.includes('25기') ||
    fullText.includes('26기') ||
    fullText.includes('수습')
  );
}
