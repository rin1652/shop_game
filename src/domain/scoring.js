// So sánh câu nói/gõ với câu mẫu theo từ (dãy con chung dài nhất). Hàm thuần.

export const tokens = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export const normText = (s) => tokens(s).join(' ');
export const wordCount = (s) => tokens(s).length;
export const hasEnglishLetters = (s) => /[a-zA-Z]/.test(s || '');

export function scoreSpeech(target, said) {
  const a = tokens(target);
  const b = tokens(said);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      matched[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const hits = matched.filter(Boolean).length;
  const extra = Math.max(0, b.length - hits);
  const score = a.length ? Math.round((hits / (a.length + extra * 0.5)) * 100) : 0;
  return { score: Math.min(100, score), words: a.map((w, k) => ({ w, ok: matched[k] })) };
}

export const scoreBand = (score) => (score >= 80 ? 'good' : score >= 50 ? 'ok' : 'bad');
