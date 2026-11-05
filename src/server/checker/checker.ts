import { ExtractedClaim, generateFindingExplanation } from '@/server/ai/gemini';

export interface SourceLookup {
  id: string;
  source_id: string;
  kind: string;
  key: string;
  title: string;
  version: number;
  value: Record<string, unknown>;
  status: string;
}

export interface ComputedFinding {
  claim_id?: string;
  kind: 'claim' | 'term' | 'guideline' | 'injection' | 'asset';
  status: 'supported' | 'contradicted' | 'expired_or_superseded' | 'unverifiable' | 'conflicting_evidence' | 'review_needed';
  severity: 'info' | 'warning' | 'blocker';
  source_version_id?: string | null;
  quote: string;
  start_idx: number;
  end_idx: number;
  explanation: string;
  suggested_fix?: string | null;
  link_status?: 'confirmed' | 'probable' | null;
}

/**
 * Normalizes numbers and units for comparison
 */
export function normalizeValue(num: number | null, unit: string | null): { num: number | null; unit: string } {
  if (num === null) return { num: null, unit: '' };
  const u = (unit || '').toLowerCase().trim();

  if (u.includes('user') || u.includes('month') || u.includes('inr_per_user_month')) {
    return { num, unit: 'inr_per_user_month' };
  }
  if (u.includes('day')) return { num, unit: 'days' };
  if (u.includes('percent') || u === '%') return { num, unit: 'percent' };
  if (u.includes('inr') || u.includes('rs') || u.includes('rupee')) return { num, unit: 'inr' };

  return { num, unit: u };
}

/**
 * Compare extracted claims and term rules against approved sources deterministically
 */
export async function runDeterministicChecks(
  text: string,
  claims: ExtractedClaim[],
  sources: SourceLookup[],
  injectionSuspected: boolean = false
): Promise<ComputedFinding[]> {
  const findings: ComputedFinding[] = [];

  // Group sources by key
  const sourcesByKey = new Map<string, SourceLookup[]>();
  for (const s of sources) {
    const list = sourcesByKey.get(s.key) || [];
    list.push(s);
    sourcesByKey.set(s.key, list);
  }

  // 1. Check Claims against Fact Sources
  for (const claim of claims) {
    // If claim context is historical, quoted, or hypothetical, it does not bind to current facts
    if (claim.context !== 'current') {
      findings.push({
        kind: 'claim',
        status: 'supported',
        severity: 'info',
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Historical context (${claim.context}): no dependency created on current facts.`,
        suggested_fix: null,
        link_status: null, // No dependency created!
      });
      continue;
    }

    if (!claim.fact_key) {
      findings.push({
        kind: 'claim',
        status: 'unverifiable',
        severity: 'warning',
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: 'No approved source covers this factual claim.',
        suggested_fix: 'Remove the claim or ask a knowledge owner to add an approved source.',
        link_status: null,
      });
      continue;
    }

    const matchedSources = sourcesByKey.get(claim.fact_key) || [];
    if (matchedSources.length === 0) {
      findings.push({
        kind: 'claim',
        status: 'unverifiable',
        severity: 'warning',
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `No approved source found for key "${claim.fact_key}".`,
        suggested_fix: 'Remove the claim or ask an owner to add an approved source.',
        link_status: null,
      });
      continue;
    }

    if (matchedSources.length > 1) {
      findings.push({
        kind: 'claim',
        status: 'conflicting_evidence',
        severity: 'blocker',
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Conflicting sources exist for key "${claim.fact_key}".`,
        suggested_fix: 'Escalate to the knowledge owner.',
        link_status: null,
      });
      continue;
    }

    const source = matchedSources[0];

    if (source.status !== 'current') {
      findings.push({
        kind: 'claim',
        status: 'expired_or_superseded',
        severity: 'blocker',
        source_version_id: source.id,
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Source "${source.title}" v${source.version} is ${source.status}.`,
        suggested_fix: 'Check the latest approved value with the source owner.',
        link_status: null,
      });
      continue;
    }

    // Compare numeric values
    const sourceNum = typeof source.value?.number === 'number' ? source.value.number : null;
    const sourceUnit = typeof source.value?.unit === 'string' ? source.value.unit : '';
    const sourceDisplay = String(source.value?.display || `${sourceNum} ${sourceUnit}`);

    const normClaim = normalizeValue(claim.number, claim.unit);
    const normSource = normalizeValue(sourceNum, sourceUnit);

    const numbersMatch =
      normClaim.num !== null &&
      normSource.num !== null &&
      Math.abs(normClaim.num - normSource.num) < 0.0001;

    if (numbersMatch) {
      findings.push({
        kind: 'claim',
        status: 'supported',
        severity: 'info',
        source_version_id: source.id,
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Matches approved ${source.title} (v${source.version}): ${sourceDisplay}.`,
        suggested_fix: null,
        link_status: 'confirmed', // confirmed dependency!
      });
    } else {
      findings.push({
        kind: 'claim',
        status: 'contradicted',
        severity: 'blocker',
        source_version_id: source.id,
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `The content states "${claim.quote}", but approved ${source.title} (v${source.version}) is ${sourceDisplay}.`,
        suggested_fix: `Change to "${sourceDisplay}".`,
        link_status: null,
      });
    }
  }

  // 2. Check Term Rules (banned patterns and spelling)
  const termSources = sources.filter(s => s.kind === 'term' && s.status === 'current');
  for (const term of termSources) {
    const val = term.value || {};

    if (val.type === 'banned' && typeof val.pattern === 'string') {
      try {
        const regex = new RegExp(`\\b(?:${val.pattern})\\b`, 'gi');
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
          findings.push({
            kind: 'term',
            status: 'contradicted',
            severity: 'blocker',
            source_version_id: term.id,
            quote: m[0],
            start_idx: m.index,
            end_idx: m.index + m[0].length,
            explanation: String(val.message || 'Avoid unprovable guarantees and banned terms.'),
            suggested_fix: 'Remove or rephrase this claim to avoid absolute guarantees.',
            link_status: 'confirmed',
          });
        }
      } catch (e) {
        console.warn('Invalid regex in banned term:', val.pattern, e);
      }
    }

    if (val.type === 'spelling' && typeof val.preferred === 'string' && Array.isArray(val.wrong)) {
      for (const wrongWord of val.wrong) {
        if (typeof wrongWord !== 'string') continue;
        const regex = new RegExp(`\\b${wrongWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
          if (m[0] !== val.preferred) {
            findings.push({
              kind: 'term',
              status: 'contradicted',
              severity: 'warning',
              source_version_id: term.id,
              quote: m[0],
              start_idx: m.index,
              end_idx: m.index + m[0].length,
              explanation: `Spelling error: "${m[0]}" should be formatted as "${val.preferred}".`,
              suggested_fix: `Replace with "${val.preferred}".`,
              link_status: 'confirmed',
            });
          }
        }
      }
    }
  }

  // 3. Prompt-Injection Heuristic Check
  const injectionPatterns = [
    /ignore previous(?: instructions| prompt)?/i,
    /system prompt/i,
    /you are now(?: a)?/i,
    /mark (?:this|the) content as approved/i,
    /approve this(?: content)?/i,
    /disregard previous/i,
  ];

  for (const pattern of injectionPatterns) {
    const m = pattern.exec(text);
    if (m) {
      findings.push({
        kind: 'injection',
        status: 'review_needed',
        severity: 'blocker',
        quote: m[0],
        start_idx: m.index,
        end_idx: m.index + m[0].length,
        explanation: 'Potential prompt injection detected: instructions to bypass or override review were found.',
        suggested_fix: 'Remove instructions intended to override the review system.',
        link_status: null,
      });
      break;
    }
  }

  return findings;
}

