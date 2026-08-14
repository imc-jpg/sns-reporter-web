/**
 * Helper utility to determine if a content item belongs to Trainee reporters (수습 단원 / 25기)
 */
export const isTraineeContent = (item: any): boolean => {
  if (!item) return false;

  const author = (item.author_name || '').toString();
  const team = (item.team || '').toString();
  const title = (item.title || '').toString();
  const keywords = (item.keywords || '').toString();
  
  let crewString = '';
  if (item.parsedCrew) {
    crewString = item.parsedCrew;
  } else if (item.content_body && item.content_body.startsWith('{')) {
    try {
      const bodyObj = JSON.parse(item.content_body);
      if (typeof bodyObj.crew === 'string') {
        crewString = bodyObj.crew;
      } else if (Array.isArray(bodyObj.crew)) {
        crewString = bodyObj.crew.map((c: any) => c.name || c).join(',');
      }
    } catch (e) {}
  }

  // Returns true if author, team, title, keywords, or crew contains 25기 or 수습
  return (
    author.includes('25기') ||
    author.includes('수습') ||
    team.includes('25기') ||
    team.includes('수습') ||
    title.includes('25기') ||
    title.includes('수습') ||
    keywords.includes('25기') ||
    keywords.includes('수습') ||
    crewString.includes('25기') ||
    crewString.includes('수습')
  );
};
