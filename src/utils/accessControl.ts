/**
 * 중앙 접근 권한 및 이름/참여자 매칭 유틸리티
 */

export function cleanName(name?: string | null): string {
  if (!name) return '';
  return name
    .replace(/^\d+(기)?\s*/, '') // 기수 접두사 제거: '24기 ', '25기', '22 '
    .replace(/\s*\([^)]*\)/g, '') // 괄호 및 학과/소속 내용 제거: '(문과대학 불어불문학)'
    .replace(/\s*\[[^\]]*\]/g, '') // 대괄호 제거
    .replace(/\s+/g, '') // 공백 제거
    .toLowerCase()
    .trim();
}

export function matchesName(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const ca = cleanName(a);
  const cb = cleanName(b);
  if (!ca || !cb) return false;
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

export function isUserCrewMember(crewData: any, userEmail?: string | null, userName?: string | null): boolean {
  if (!crewData) return false;
  const cleanUser = cleanName(userName);
  const lowerEmail = (userEmail || '').trim().toLowerCase();

  // 문자열 형태: "한가은, 전소영, 정시연"
  if (typeof crewData === 'string') {
    if (lowerEmail && crewData.toLowerCase().includes(lowerEmail)) return true;
    if (cleanUser) {
      const parts = crewData.split(/[,/&+\s]+/).map(p => cleanName(p)).filter(Boolean);
      if (parts.some(p => p === cleanUser || p.includes(cleanUser) || cleanUser.includes(p))) {
        return true;
      }
    }
    return false;
  }

  // 배열 형태: ["전소영", "정시연"] 또는 [{ name: "전소영", email: "..." }]
  if (Array.isArray(crewData)) {
    return crewData.some(item => {
      if (typeof item === 'string') {
        const p = cleanName(item);
        if (lowerEmail && item.toLowerCase().includes(lowerEmail)) return true;
        if (cleanUser && (p === cleanUser || p.includes(cleanUser) || cleanUser.includes(p))) return true;
      } else if (item && typeof item === 'object') {
        if (lowerEmail && (item.email || '').toLowerCase() === lowerEmail) return true;
        const p = cleanName(item.name || item.author_name || '');
        if (cleanUser && (p === cleanUser || p.includes(cleanUser) || cleanUser.includes(p))) return true;
      }
      return false;
    });
  }

  return false;
}

export function isUserContentOwnerOrCrew(
  content: { author_name?: string | null; content_body?: any },
  user: { email?: string | null; name?: string | null }
): boolean {
  if (!user) return false;
  const userEmail = (user.email || '').trim().toLowerCase();
  const userName = user.name || '';

  let bodyObj = content.content_body;
  if (typeof bodyObj === 'string') {
    try {
      bodyObj = JSON.parse(bodyObj);
    } catch {
      bodyObj = {};
    }
  }
  bodyObj = bodyObj || {};

  // 1. 이메일 매칭
  const authorEmail = (bodyObj.authorEmail || bodyObj.author_email || '').trim().toLowerCase();
  if (userEmail && authorEmail && userEmail === authorEmail) return true;
  if (userEmail && content.author_name && content.author_name.toLowerCase() === userEmail) return true;

  // 2. 작성자 이름 매칭
  if (content.author_name && userName && matchesName(content.author_name, userName)) return true;

  // 3. 크루/참여단원 매칭
  if (isUserCrewMember(bodyObj.crew, userEmail, userName)) return true;

  return false;
}

export function canViewSecretComment({
  msg,
  currentUser,
  contentAuthorName,
  contentBody,
}: {
  msg: any;
  currentUser?: { name?: string | null; email?: string | null; isAdmin?: boolean } | null;
  contentAuthorName?: string | null;
  contentBody?: any;
}): boolean {
  if (!msg?.isSecret) return true;
  if (!currentUser) return false;
  if (currentUser.isAdmin) return true;

  const userEmail = (currentUser.email || '').trim().toLowerCase();
  const userName = currentUser.name || '';

  // 1. 본인이 작성한 비밀 댓글인 경우
  if (msg.authorEmail && userEmail && msg.authorEmail.toLowerCase() === userEmail) return true;
  if (msg.author && userName && matchesName(msg.author, userName)) return true;

  // 2. 본인이 해당 기획안의 작성자이거나 참여 크루인 경우
  if (isUserContentOwnerOrCrew({ author_name: contentAuthorName, content_body: contentBody }, { email: userEmail, name: userName })) {
    return true;
  }

  return false;
}
