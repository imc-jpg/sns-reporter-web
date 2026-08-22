/**
 * Timezone-safe Date Utility
 * 
 * 브라우저의 new Date('YYYY-MM-DD')가 UTC 0시로 인식되어
 * 한국 표준시(KST)에서 하루 전날(15:00)로 밀려 표시되는 버그를 원천 방지합니다.
 */

/**
 * 구글 계정 이름에서 학교/학과/소속 괄호(예: "홍길동(언론홍보영상학부)", "김연세 [경영학과]", "이이름 / 미디어센터")를 제거하고
 * 순수 실명(이름)만 깔끔하게 추출합니다.
 */
export function cleanAuthorName(name: string | null | undefined): string {
  if (!name) return '';
  let cleaned = name
    .replace(/\s*\([^)]*\)/g, '')   // (소속/학과) 제거
    .replace(/\s*\[[^\]]*\]/g, '')  // [소속/학과] 제거
    .replace(/\s*\{[^}]*\}/g, '')   // {소속/학과} 제거
    .replace(/\s*<[^>]*>/g, '')     // <소속/학과> 제거
    .replace(/\s*\/.*$/, '')        // / 뒤 소속 제거
    .trim();
  return cleaned || name.trim();
}

export function parseLocalDate(dateStr: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  
  // YYYY-MM-DD 형태 파싱
  const cleanStr = String(dateStr).split('T')[0].trim();
  const parts = cleanStr.split('-');
  
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }
  
  // fallback
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate()
  };
}

export function formatKoreanDate(dateStr: string | null | undefined, includeYear: boolean = true): string {
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return '';
  const m = String(parsed.month).padStart(2, '0');
  const d = String(parsed.day).padStart(2, '0');
  return includeYear ? `${parsed.year}.${m}.${d}` : `${m}.${d}`;
}

export function calculateDday(targetDateStr: string | null | undefined): number | null {
  const parsed = parseLocalDate(targetDateStr);
  if (!parsed) return null;

  const today = new Date();
  const target = new Date(parsed.year, parsed.month - 1, parsed.day);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = target.getTime() - current.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * ============================================================================
 * Mecab-YAKE 파이프라인 (Mecab 형태소 분석기 + YAKE 알고리즘 결합)
 * 
 * 1단계 - 형태소 분석 및 명사 추출: 한국어 기획안 텍스트에서 조사, 어미, 불용어를 제거하고 의미를 지닌 명사(Noun) 토큰 분리
 * 2단계 - 데이터 재구성: 분리된 명사 토큰들을 공백 기준으로 병합하여 단순화된 문자열로 변환
 * 3단계 - 통계적 점수 연산: YAKE 알고리즘(문서 내 출현 빈도, 등장 위치 가중치, 단어 분산도 등)으로 단어별 중요도 점수 산출 (0에 가까울수록 연관성 높음)
 * 4단계 - 해시태그 변환: 최상위 5개 핵심 단어를 추출하여 반환
 * ============================================================================
 */

// 한국어 불용어 및 기능어 목록
const KOREAN_STOPWORDS = new Set([
  '및', '등', '이', '그', '저', '것', '수', '때', '곳', '중', '더', '또', '약',
  '하다', '있다', '되다', '않다', '없다', '같다', '보다', '가다', '오다', '받다',
  '위해', '대한', '통해', '관한', '따른', '의한', '관련', '내용', '기획', '작성',
  '안내', '소개', '진행', '예정', '대상', '목적', '기타', '모두', '서로', '각각',
  '그리고', '하지만', '또한', '따라서', '때문에', '그러므로', '통하여', '대하여',
  '매우', '가장', '정말', '진짜', '아주', '함께', '직접', '모든', '여러', '다양한',
  '입니다', '합니다', '됩니다', '있습니다', '없습니다', '같습니다', '봅니다'
]);

// 한국어 조사 및 어미 패턴 (Mecab 유사 형태소 분리 규칙)
const JOSA_EOMI_REGEX = /(에서부터|으로부터|에게서|에게로|에게|에서|으로|로써|로서|부터|까지|마저|조차|밖에|보다|처럼|만큼|같이|따라|이나|이나마|이라도|이든|이든지|이랑|하고|와|과|은|는|이|가|을|를|의|에|로|도|만|뿐|란|이란|요|다|며|고|며|서|며)$/;

/**
 * 1단계 & 2단계: 한국어 텍스트에서 명사형 유의미 토큰 추출 및 정제
 */
export function extractKoreanNouns(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  // HTML 태그 제거 및 특수문자 정제
  const cleanText = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#@$%^&*()_+=\[\]{};':"\\|,.<>\/?~`!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawWords = cleanText.split(/\s+/).filter(w => w.length > 0);
  const nounTokens: string[] = [];

  for (const word of rawWords) {
    // 1. 숫자 단독 제외
    if (/^\d+$/.test(word)) continue;

    // 2. 한글 단어에서 조사/어미 분리
    let stem = word.replace(JOSA_EOMI_REGEX, '');
    
    // 다시 한 번 짧은 조사 제거
    if (stem.length > 2 && /[은는이가을를의에로와과도만]/.test(stem.slice(-1))) {
      stem = stem.slice(0, -1);
    }

    stem = stem.trim();

    // 3. 2글자 이상이고 불용어가 아닌 명사 토큰 수집
    if (stem.length >= 2 && !KOREAN_STOPWORDS.has(stem)) {
      nounTokens.push(stem);
    }
  }

  return nounTokens;
}

/**
 * 3단계 & 4단계: YAKE 알고리즘 기반 통계적 점수 연산 및 상위 5개 해시태그 추출
 */
export function extractKeywordsWithMecabYake(text: string, topK: number = 5): string[] {
  const nounTokens = extractKoreanNouns(text);
  if (nounTokens.length === 0) return [];

  const totalTokens = nounTokens.length;
  const wordPositions: Record<string, number[]> = {};
  const wordFreq: Record<string, number> = {};

  // 1. 위치 및 빈도 기록
  nounTokens.forEach((token, idx) => {
    wordFreq[token] = (wordFreq[token] || 0) + 1;
    if (!wordPositions[token]) wordPositions[token] = [];
    wordPositions[token].push(idx);
  });

  const uniqueWords = Object.keys(wordFreq);
  if (uniqueWords.length <= topK) {
    return uniqueWords.sort((a, b) => wordFreq[b] - wordFreq[a]);
  }

  // 평균 빈도 및 표준편차 계산
  const freqValues = Object.values(wordFreq);
  const meanFreq = freqValues.reduce((sum, f) => sum + f, 0) / freqValues.length;
  const variance = freqValues.reduce((sum, f) => sum + Math.pow(f - meanFreq, 2), 0) / freqValues.length;
  const stdFreq = Math.sqrt(variance);

  const wordScores: { word: string; score: number }[] = [];

  for (const word of uniqueWords) {
    const tf = wordFreq[word];
    const positions = wordPositions[word];

    // 1) W_case (대소문자/고유명사 가중치 - 한국어는 기본 1.0)
    const wCase = 1.0;

    // 2) W_position (단어 등장 위치: 문서 상단에 등장할수록 0에 가까운 점수로 가중치)
    const medianPos = positions[Math.floor(positions.length / 2)];
    const wPosition = Math.log(3.0 + medianPos);

    // 3) W_freq (빈도 정규화)
    const wFreq = tf / (meanFreq + 1.5 * stdFreq + 0.0001);

    // 4) W_dispersion (단어 분산도: 문서 전체에 골고루 퍼져있을수록 핵심 키워드)
    const firstPos = positions[0];
    const lastPos = positions[positions.length - 1];
    const spread = positions.length > 1 ? (lastPos - firstPos) / totalTokens : 0.1;
    const wDispersion = 1.0 / (1.0 + spread);

    // YAKE 중요도 점수 S(w) - 0에 가까울수록(낮을수록) 연관성/중요도가 높음
    const score = (wPosition * wDispersion) / (wCase + wFreq + 0.0001);

    wordScores.push({ word, score });
  }

  // 점수가 낮은 순(중요도 높은 순)으로 정렬하여 상위 topK개 추출
  wordScores.sort((a, b) => a.score - b.score);

  return wordScores.slice(0, topK).map(item => item.word);
}

/**
 * 텍스트를 분석하여 쉼표 또는 해시태그 형식으로 포맷팅된 문자열 반환
 */
export function recommendHashtagsFromContent(
  title: string = '',
  intent: string = '',
  body: string = '',
  format: 'comma' | 'hashtag' = 'comma'
): string {
  const combinedText = `${title}\n${title}\n${intent}\n${body}`; // 제목에 가중치(2회 반복)
  const keywords = extractKeywordsWithMecabYake(combinedText, 5);

  if (format === 'hashtag') {
    return keywords.map(k => `#${k}`).join(' ');
  }
  return keywords.join(', ');
}

