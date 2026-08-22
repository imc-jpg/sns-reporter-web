import { createClient } from "@/utils/supabase/server";
import ContentsLayout from "@/components/ContentsLayout";
type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchResultsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams?.q === 'string' ? resolvedParams.q : '';
  const isAdmin = resolvedParams?.admin === 'true';

  const supabase = await createClient();

  const { data: contents } = await supabase
    .from('contents')
    .select('*')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('status', 'draft')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  let results = contents || [];

  if (query) {
    const qLower = query.toLowerCase();
    results = results.filter(item => 
      item.title?.toLowerCase().includes(qLower) ||
      item.author_name?.toLowerCase().includes(qLower) ||
      item.team?.toLowerCase().includes(qLower) ||
      item.content_type?.toLowerCase().includes(qLower) ||
      item.feedback_comment?.toLowerCase().includes(qLower) ||
      item.content_body?.toLowerCase().includes(qLower)
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserEmail = user?.email || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
          "{query}" 검색 결과 <span style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>({results.length}건)</span>
        </h2>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {results.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            검색 결과가 없습니다.
          </div>
        ) : (
          <ContentsLayout 
            initialContents={results} 
            searchQuery={query}
            currentUserEmail={currentUserEmail}
          />
        )}
      </div>
    </div>
  );
}
