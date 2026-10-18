'use client';

import { FormEvent, useMemo, useState } from 'react';

type Problem = {
  contestId?: number;
  index: string;
  name: string;
  rating?: number;
  tags?: string[];
  type?: string;
};
type Submission = {
  id: number;
  verdict?: string;
  creationTimeSeconds: number;
  programmingLanguage?: string;
  problem: Problem;
  contestId?: number;
};
type SolvedProblem = {
  key: string;
  problem: Problem;
  submission: Submission;
  solvedAt: number;
};

const PAGE_SIZE = 1000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const problemKey = (p: Problem) => `${p.contestId ?? 'unknown'}-${p.index}`;
const problemUrl = (p: Problem) => p.contestId
  ? `https://codeforces.com/problemset/problem/${p.contestId}/${encodeURIComponent(p.index)}`
  : 'https://codeforces.com/problemset';
const submissionUrl = (s: Submission) => s.contestId
  ? `https://codeforces.com/contest/${s.contestId}/submission/${s.id}`
  : `https://codeforces.com/submissions`;
const dateLabel = (seconds: number) => new Date(seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function Home() {
  const [handle, setHandle] = useState('');
  const [activeHandle, setActiveHandle] = useState('');
  const [items, setItems] = useState<SolvedProblem[]>([]);
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState('recent');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);

  async function loadProblems(event?: FormEvent) {
    event?.preventDefault();
    const cleanHandle = handle.trim();
    if (!cleanHandle) return;
    setLoading(true);
    setError('');
    setItems([]);
    setActiveHandle(cleanHandle);
    setSubmissionCount(0);
    setFinished(false);
    setProgress('Connecting to Codeforces…');
    const unique = new Map<string, SolvedProblem>();
    let from = 1;
    let total = 0;
    try {
      while (true) {
        setProgress(`Reading submissions ${from.toLocaleString()}–${(from + PAGE_SIZE - 1).toLocaleString()}…`);
        const response = await fetch(`/api/submissions?handle=${encodeURIComponent(cleanHandle)}&from=${from}&count=${PAGE_SIZE}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load this Codeforces profile.');
        const batch: Submission[] = data.result || [];
        if (from === 1 && batch.length === 0) {
          setProgress('No submissions found for this handle.');
          setFinished(true);
          break;
        }
        total += batch.length;
        for (const submission of batch) {
          if (submission.verdict !== 'OK' || !submission.problem) continue;
          const key = problemKey(submission.problem);
          const existing = unique.get(key);
          // API results are newest first, so the first accepted attempt is the latest accepted submission.
          if (!existing) unique.set(key, { key, problem: submission.problem, submission, solvedAt: submission.creationTimeSeconds });
        }
        setItems([...unique.values()]);
        setSubmissionCount(total);
        if (batch.length < PAGE_SIZE) {
          setFinished(true);
          setProgress(`Finished · scanned ${total.toLocaleString()} submissions`);
          break;
        }
        from += batch.length;
        // Codeforces asks clients to keep API requests at least two seconds apart.
        await wait(2100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setProgress('');
    } finally {
      setLoading(false);
    }
  }

  const allTags = useMemo(() => Array.from(new Set(items.flatMap((item) => item.problem.tags || []))).sort(), [items]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      const p = item.problem;
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || `${p.contestId ?? ''}${p.index}`.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesRating = rating === 'all' || (rating === 'unrated' ? !p.rating : p.rating !== undefined && (rating === '800' ? p.rating <= 800 : rating === '1000' ? p.rating >= 900 && p.rating <= 1100 : rating === '1200' ? p.rating >= 1100 && p.rating <= 1300 : rating === '1400' ? p.rating >= 1300 && p.rating <= 1500 : p.rating >= 1600));
      const matchesTag = tag === 'all' || (p.tags || []).includes(tag);
      return matchesQuery && matchesRating && matchesTag;
    }).sort((a, b) => sort === 'rating-asc' ? (a.problem.rating ?? 9999) - (b.problem.rating ?? 9999) : sort === 'rating-desc' ? (b.problem.rating ?? -1) - (a.problem.rating ?? -1) : sort === 'name' ? a.problem.name.localeCompare(b.problem.name) : b.solvedAt - a.solvedAt);
  }, [items, query, rating, tag, sort]);
  const averageRating = items.filter((x) => x.problem.rating).length
    ? Math.round(items.reduce((sum, x) => sum + (x.problem.rating || 0), 0) / items.filter((x) => x.problem.rating).length)
    : null;
  const maxRating = items.reduce((max, x) => Math.max(max, x.problem.rating || 0), 0);

  return (
    <main className="app-shell">
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="CF Ledger home"><span className="brand-mark">cf<span>.</span></span><span>ledger</span></a>
        <div className="nav-right"><span className="live-dot" /> <span>Powered by Codeforces API</span><a href="https://codeforces.com/apiHelp" target="_blank" rel="noreferrer">API docs ↗</a></div>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR PRACTICE, IN ONE PLACE</div>
        <h1>Every solve.<br /><span>One clear picture.</span></h1>
        <p className="hero-copy">Turn a Codeforces handle into a searchable record of accepted problems, difficulty, topics, and the exact submission that solved it.</p>
        <form className="search-form" onSubmit={loadProblems}>
          <div className="input-wrap"><span className="at-symbol">@</span><input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Enter Codeforces handle" aria-label="Codeforces handle" autoCapitalize="none" spellCheck={false} required /></div>
          <button type="submit" disabled={loading || !handle.trim()}>{loading ? <><span className="spinner" /> Fetching</> : <>Find my problems <span>↗</span></>}</button>
        </form>
        <div className="microcopy"><span>↳</span> No login. No account. No cost. Just your public profile.</div>
        {progress && <div className="status-line"><span className={loading ? 'status-pulse' : 'status-check'}>{loading ? '◌' : finished ? '✓' : '!'}</span>{progress}{loading && <span className="status-note">Large histories can take a little while.</span>}</div>}
        {error && <div className="error-banner">{error} <button onClick={() => loadProblems()} type="button">Try again</button></div>}
      </section>

      <section className="results" aria-live="polite">
        <div className="section-heading"><div><div className="eyebrow small"><span className="eyebrow-line" /> THE BREAKDOWN</div><h2>{activeHandle ? <><span className="handle-label">@{activeHandle}</span> at a glance</> : 'Your problem archive'}</h2></div><span className="data-chip"><span className="live-dot" /> {items.length ? 'LIVE PROFILE DATA' : 'READY WHEN YOU ARE'}</span></div>
        <div className="stats-grid">
          <article className="stat-card primary-stat"><div className="stat-label">UNIQUE PROBLEMS SOLVED <span>↗</span></div><div className="stat-value">{items.length.toLocaleString()}<small> problems</small></div><div className="stat-foot">Accepted problems, counted once</div><div className="stat-watermark">✓</div></article>
          <article className="stat-card"><div className="stat-label">SUBMISSIONS SCANNED</div><div className="stat-value">{submissionCount.toLocaleString()}</div><div className="stat-foot">Across fetched history</div></article>
          <article className="stat-card"><div className="stat-label">AVERAGE PROBLEM RATING</div><div className="stat-value">{averageRating?.toLocaleString() ?? '—'}</div><div className="stat-foot">Rated problems only</div></article>
          <article className="stat-card"><div className="stat-label">HIGHEST SOLVED RATING</div><div className="stat-value">{maxRating ? maxRating.toLocaleString() : '—'}</div><div className="stat-foot">A small milestone worth keeping</div></article>
        </div>

        <div className="table-card">
          <div className="table-top"><div><h3>Accepted problems <span className="count-pill">{filtered.length.toLocaleString()}</span></h3><p>Each row links to the problem and your accepted submission.</p></div><button className="export-btn" disabled={!filtered.length} onClick={() => { const rows = [['Problem','Contest','Index','Rating','Tags','Solved date','Problem URL','Accepted submission URL'], ...filtered.map((x) => [x.problem.name, x.problem.contestId ?? '', x.problem.index, x.problem.rating ?? '', (x.problem.tags || []).join('; '), dateLabel(x.solvedAt), problemUrl(x.problem), submissionUrl(x.submission)])]; const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${activeHandle || 'codeforces'}-solved-problems.csv`; a.click(); URL.revokeObjectURL(url); }}>↓ Export CSV</button></div>
          <div className="filters"><label className="filter-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search problems, IDs, topics…" /></label><select aria-label="Filter by rating" value={rating} onChange={(e) => setRating(e.target.value)}><option value="all">All ratings</option><option value="800">≤ 800</option><option value="1000">900–1100</option><option value="1200">1100–1300</option><option value="1400">1300–1500</option><option value="1600">1600+</option><option value="unrated">Unrated</option></select><select aria-label="Filter by topic" value={tag} onChange={(e) => setTag(e.target.value)}><option value="all">All topics</option>{allTags.map((t) => <option key={t} value={t}>{t}</option>)}</select><select aria-label="Sort problems" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Recently solved</option><option value="rating-asc">Rating: low to high</option><option value="rating-desc">Rating: high to low</option><option value="name">Name: A–Z</option></select></div>
          <div className="table-scroll"><table><thead><tr><th>PROBLEM</th><th>RATING</th><th>TOPICS</th><th>SOLVED ON</th><th>LINKS</th></tr></thead><tbody>
            {filtered.map((item) => <tr key={item.key}><td><div className="problem-title"><a href={problemUrl(item.problem)} target="_blank" rel="noreferrer">{item.problem.name}</a><span>{item.problem.contestId}{item.problem.index ? ` · ${item.problem.index}` : ''}</span></div></td><td>{item.problem.rating ? <span className={`rating rating-${Math.min(5, Math.max(1, Math.ceil(item.problem.rating / 800)))}`}>{item.problem.rating}</span> : <span className="muted">—</span>}</td><td><div className="tags">{(item.problem.tags || []).slice(0, 3).map((t) => <button key={t} onClick={() => setTag(t)} className="tag">{t}</button>)}{(item.problem.tags || []).length > 3 && <span className="muted">+{item.problem.tags.length - 3}</span>}</div></td><td className="date-cell">{dateLabel(item.solvedAt)}</td><td><a className="submission-link" href={submissionUrl(item.submission)} target="_blank" rel="noreferrer" title="Open accepted submission">View submission ↗</a></td></tr>)}
            {!filtered.length && <tr><td colSpan={5} className="empty-state"><div className="empty-icon">⌕</div><strong>{items.length ? 'No matching problems' : 'Your archive starts here'}</strong><p>{items.length ? 'Try changing the search or filters.' : 'Enter a handle above to fetch accepted submissions from Codeforces.'}</p></td></tr>}
          </tbody></table></div>
          <div className="table-bottom"><span>Showing {filtered.length.toLocaleString()} of {items.length.toLocaleString()} unique solved problems</span><span className="table-bottom-right"><span className="live-dot" /> {finished ? 'History scan complete' : loading ? 'Scanning history' : 'Waiting for a handle'}</span></div>
        </div>
      </section>
      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark">cf<span>.</span></span><span>ledger</span></a><span>Made for people who keep showing up.</span><span>Data from <a href="https://codeforces.com" target="_blank" rel="noreferrer">Codeforces</a> · Free, always.</span></footer>
    </main>
  );
}
