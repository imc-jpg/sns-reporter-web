export default function GuidelinesPage() {
  return (
    <div className="flex-col gap-4" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>SNS기자단 콘텐츠 가이드라인</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>연세대학교 기자단이 지켜야 할 원칙과 노하우를 확인하세요.</p>
      </header>

      {/* 필독사항 */}
      <section className="card" style={{ borderLeft: '4px solid #ef4444' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444' }}>🚨 필독사항</h2>
        <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
          <li><b>26년 4월 ~:</b> 기획안, 발행 시트, 콘텐츠 제출본을 한곳에서 일원화하여 관리하는 통합 서비스 적용.</li>
          <li>기획안과 완성본은 반드시 <b>최종 게시 전 피드백 과정</b>을 거쳐야 하므로 승인 없이 바로 업로드되지 않습니다.</li>
          <li>연세대학교 인스타그램 채널은 50만이 넘는 팔로워를 보유하고 있습니다. 여러분의 열정과 책임감이 큰 파급력으로 이어지는 만큼, 자부심을 가지고 최선을 다해 주시기를 부탁드립니다 😊</li>
        </ul>
      </section>

      {/* 기획 및 취재 원칙 */}
      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>1. 콘텐츠 기획 및 취재 원칙</h2>
        <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>📌 원칙: 모든 콘텐츠는 직접 취재를 원칙으로 합니다.</p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
            <li>홈페이지나 포털에서 쉽게 찾을 수 있는 단순 정보성 콘텐츠(플레이리스트, 추천, 단순 큐레이션)보다는 <b>여러분의 시각과 노력</b>이 담긴 기획을 환영합니다.</li>
            <li>직접 취재가 어려울 경우 관련 학우에게 자료를 요청하거나 <b>명확히 출처를 기재</b>해야 합니다.</li>
            <li><i style={{ color: '#6b7280' }}>* 예외: 단순 추천 콘텐츠라도 연세대학교만의 색깔이 묻어나거나, 생생한 인터뷰가 포함되어 있다면 좋은 기사로 인정됩니다.</i></li>
          </ul>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>🤝 섭외 DM 지원</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              외부 인플루언서 및 학우 섭외가 필요할 경우 연세대 <b>공식 계정으로 DM</b>을 보내드립니다. 섭외 대상과 보낼 텍스트 내용을 단장님이나 담당자에게 카톡으로 편하게 전달해 주세요.
            </p>
          </div>
          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>⏰ 시의성이 중요한 콘텐츠</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              행사, 트렌드 등 타이밍이 생명인 콘텐츠는 마감일에 구애받지 말고 <b>기획 단계부터 미디어센터와 실시간으로 소통</b>해 주세요.
            </p>
          </div>
        </div>
      </section>

      {/* 플랫폼별 가이드라인 */}
      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>2. 플랫폼별 콘텐츠 제작 주의사항</h2>
        
        <div className="flex-col gap-4">
          {/* 인스타그램 */}
          <div style={{ borderLeft: '4px solid #e1306c', paddingLeft: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e1306c', marginBottom: '0.5rem' }}>인스타그램 (카드뉴스 & 릴스)</h3>
            <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><b>템플릿 변형 금지:</b> 미리캔버스, 망고보드 템플릿은 레이아웃 참고만 하거나 그대로 사용하되, 연세대만의 색깔을 녹여내주세요.</li>
              <li><b>해상도 & 비율:</b> 카드뉴스는 1080x1350 (세로형), 릴스는 1080x1920(FHD) mp4 확장자를 준수합니다.</li>
              <li><b>가독성:</b> 텍스트는 전체 이미지 면적의 절반을 넘지 않도록 간결하게 구성하세요. 빈 여백이 있어야 학우들의 반응이 높아집니다.</li>
              <li><b>해시태그:</b> 핵심 키워드 위주로 <b>최대 5개</b>까지만 달아주세요. 그 이상은 인식이 안 될 수 있습니다.</li>
              <li><b>음원 처리:</b> 릴스는 원활한 싱크를 위해 영상에 음원을 직접 입혀서 제출하는 것을 권장합니다.</li>
            </ul>
          </div>

          {/* 블로그 */}
          <div style={{ borderLeft: '4px solid #03c75a', paddingLeft: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#03c75a', marginBottom: '0.5rem' }}>네이버 블로그</h3>
            <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>기존 발행글과 중복 방지를 위한 <b>사전 노출 검색</b> 필수</li>
              <li>상위 노출을 위해 본문 텍스트 길이는 <b>총 3,000자 이상</b> 작성을 권장합니다.</li>
              <li>본문 내 <b>'연세대학교', '꿀팁', '대학생'</b> 등 타깃층 검색 키워드를 반복&자연스럽게 녹여주세요.</li>
            </ul>
          </div>

          {/* 유튜브 롱폼 */}
          <div style={{ borderLeft: '4px solid #ff0000', paddingLeft: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ff0000', marginBottom: '0.5rem' }}>유튜브 (롱폼 영상)</h3>
            <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>기획 단계에서 방송사 출신 PD님 등 전문가에게 적극적으로 조언을 구하세요.</li>
              <li>미디어센터 구독 계정인 <b>엔바토, 모션어레이</b>를 활용해 고퀄리티 음원과 자막을 사용하세요.</li>
              <li>숏폼 병행 제작 시, 가로 원본 영상을 세로로 크롭하여 포맷에 맞게 최적화하시기 바랍니다.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 소재 찾기 STEP */}
      <section className="card" style={{ marginTop: '1rem', backgroundColor: 'var(--color-primary-light)', border: 'none' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>💡 콘텐츠 소재 발굴 3단계 (STEP)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>STEP 1: 내가 하고 싶은 것</h3>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
              <li>예쁜 비주얼의 콘텐츠인가?</li>
              <li>다양한 사람을 인터뷰하고 싶은가?</li>
              <li>나만의 꿀팁을 전수하고 싶은가?</li>
            </ul>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>STEP 2: 타당성 검증</h3>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
              <li>연세대학교와 연관성이 있는가?</li>
              <li>기존 발행물과 겹치지 않는가?</li>
              <li>MZ세대, 동문 트렌드를 반영하는가?</li>
            </ul>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>STEP 3: 관심사 공유</h3>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
              <li>수험생/재학생들은 뭘 좋아할까?</li>
              <li>기자단원들끼리 채널 공유하기</li>
              <li>10-20대의 최근 알고리즘 분석</li>
            </ul>
          </div>
          
        </div>
      </section>
    </div>
  );
}
