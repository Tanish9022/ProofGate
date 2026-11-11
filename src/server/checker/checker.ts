import { ExtractedClaim } from '@/server/ai/gemini';

export interface SourceLookup {
  id: string;
  source_id: string;
  kind: string;
  key: string;
  fact_key?: string | null;
  title: string;
  version: number;
  value: Record<string, unknown>;
  status: string;
  effective_from?: string | Date | null;
  valid_until?: string | Date | null;
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

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/**
 * Converts English number words (e.g. "ninety-nine point nine", "fourteen", "fifty thousand") into a number.
 */
export function parseNumberWords(text: string): number | null {
  if (!text) return null;
  const cleaned = text.toLowerCase().replace(/[-–—]/g, ' ').trim();

  // If already standard number
  const numMatch = cleaned.match(/^(\d+(?:,\d+)*(?:\.\d+)?)$/);
  if (numMatch) {
    return parseFloat(numMatch[1].replace(/,/g, ''));
  }

  // Handle decimals like "ninety-nine point nine"
  if (cleaned.includes(' point ')) {
    const [wholePart, fracPart] = cleaned.split(' point ');
    const wholeVal = parseNumberWords(wholePart);
    if (wholeVal === null) return null;

    // Parse fractional words e.g. "nine" -> 9 -> 0.9, "five zero" -> 0.50
    const fracWords = fracPart.trim().split(/\s+/);
    let fracDigits = '';
    for (const w of fracWords) {
      if (NUMBER_WORDS[w] !== undefined && NUMBER_WORDS[w] < 10) {
        fracDigits += NUMBER_WORDS[w].toString();
      } else if (/^\d+$/.test(w)) {
        fracDigits += w;
      } else {
        return null;
      }
    }
    return parseFloat(`${wholeVal}.${fracDigits}`);
  }

  const words = cleaned.split(/\s+/);
  let total = 0;
  let current = 0;
  let hasNumberWord = false;

  for (const w of words) {
    if (NUMBER_WORDS[w] !== undefined) {
      current += NUMBER_WORDS[w];
      hasNumberWord = true;
    } else if (w === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
      hasNumberWord = true;
    } else if (w === 'thousand') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
      hasNumberWord = true;
    } else if (w === 'million') {
      total += (current === 0 ? 1 : current) * 1000000;
      current = 0;
      hasNumberWord = true;
    } else if (/^\d+$/.test(w)) {
      current += parseInt(w, 10);
      hasNumberWord = true;
    } else if (w === 'and') {
      continue;
    } else {
      // Unrecognized word inside number sequence
      return null;
    }
  }

  return hasNumberWord ? total + current : null;
}

/**
 * Deterministically checks for historical, quoted, or hypothetical context clues.
 */
export function detectDeterministicContext(
  quote: string,
  fullText: string
): 'historical' | 'quoted' | 'hypothetical' | null {
  const quoteIdx = fullText.indexOf(quote);
  const start = Math.max(0, quoteIdx !== -1 ? quoteIdx - 80 : 0);
  const end = Math.min(fullText.length, (quoteIdx !== -1 ? quoteIdx + quote.length : 0) + 80);
  const surrounding = (quoteIdx !== -1 ? fullText.slice(start, end) : quote).toLowerCase();
  const lowerQuote = quote.toLowerCase();

  // 1. Quoted attribution
  const quoteAttribution = /\b(?:according to|said|stated|claims?|reported|quoted|testified)\b/i;
  if (quoteAttribution.test(surrounding) || quoteAttribution.test(lowerQuote)) {
    return 'quoted';
  }
  // Direct quotation marks around quote or in surrounding
  if (/["'“](?:[^"'”]{3,})["'”]/.test(surrounding) && (surrounding.includes('"') || surrounding.includes('“'))) {
    // If the sentence or quote contains quotes
    if (surrounding.includes('said') || surrounding.includes('cto') || surrounding.includes('according')) {
      return 'quoted';
    }
  }

  // 2. Historical markers
  const historicalPatterns = [
    /\bin (?:19\d\d|20[0-2]\d)\b/i,
    /\blast (?:year|quarter|month|week)\b/i,
    /\bpreviously\b/i,
    /\bwas paying\b/i,
    /\bwas priced\b/i,
    /\bwas extended\b/i,
    /\bwere paying\b/i,
    /\bused to\b/i,
    /\bearlier\b/i,
    /\bhistorically\b/i,
    /\bprior to\b/i,
    /\bback in\b/i,
    /\bbefore switching\b/i,
    /\bbefore the price was\b/i,
    /\bin october 2026\b/i,
    /\bwas the reason\b/i,
  ];
  for (const pat of historicalPatterns) {
    if (pat.test(surrounding) || pat.test(lowerQuote)) {
      return 'historical';
    }
  }

  // 3. Hypothetical markers
  const hypotheticalPatterns = [
    /\bif\b/i,
    /\bcould be\b/i,
    /\bassuming\b/i,
    /\bimagine\b/i,
    /\bprojected\b/i,
    /\bhypothetically\b/i,
    /\bsuppose\b/i,
    /\bwould you\b/i,
  ];
  for (const pat of hypotheticalPatterns) {
    if (pat.test(surrounding) || pat.test(lowerQuote)) {
      return 'hypothetical';
    }
  }

  return null;
}

/**
 * Checks if claim or its surrounding context contains qualifiers that make it probable rather than exact.
 */
export function hasQualifier(quote: string, fullText?: string): boolean {
  const qualifierRegex = /\b(?:more than|over|starts?\s+from|from|up to|at least|nearly|approx(?:imately)?|about|under|less than|total for up to|unlimited users)\b/i;
  if (qualifierRegex.test(quote)) return true;
  if (fullText) {
    const idx = fullText.indexOf(quote);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(fullText.length, idx + quote.length + 40);
      const surrounding = fullText.slice(start, end);
      return qualifierRegex.test(surrounding);
    }
  }
  return false;
}

/**
 * Normalizes numbers and units for comparison.
 */
export function normalizeValue(num: number | null, unit: string | null): { num: number | null; unit: string } {
  if (num === null) return { num: null, unit: '' };
  const u = (unit || '').toLowerCase().trim();

  // Price units
  if (
    u.includes('user') ||
    u.includes('month') ||
    u.includes('inr_per_user_month') ||
    u.includes('seat') ||
    u.includes('person')
  ) {
    return { num, unit: 'inr_per_user_month' };
  }
  if (u.includes('year') || u.includes('annual')) {
    return { num, unit: 'inr_per_year' };
  }
  if (u.includes('day')) return { num, unit: 'days' };
  if (u.includes('percent') || u === '%' || u.includes('pct')) return { num, unit: 'percent' };
  if (u.includes('inr') || u.includes('rs') || u.includes('rupee')) return { num, unit: 'inr' };

  return { num, unit: u };
}

/**
 * Compare extracted claims and term rules against approved sources deterministically.
 */
export async function runDeterministicChecks(
  text: string,
  claims: ExtractedClaim[],
  sources: SourceLookup[],
  injectionSuspected: boolean = false,
  asOfDate: Date = new Date()
): Promise<ComputedFinding[]> {
  const findings: ComputedFinding[] = [];

  // Group sources by effective fact_key (s.fact_key || s.key)
  const sourcesByKey = new Map<string, SourceLookup[]>();
  for (const s of sources) {
    const key = s.fact_key || s.key;
    const list = sourcesByKey.get(key) || [];
    list.push(s);
    sourcesByKey.set(key, list);
    // Also index under s.key if different
    if (s.key && s.key !== key) {
      const keyList = sourcesByKey.get(s.key) || [];
      keyList.push(s);
      sourcesByKey.set(s.key, keyList);
    }
  }

  // 1. Check Claims against Fact Sources
  for (const claim of claims) {
    // Deterministic context analysis
    const detectedContext = detectDeterministicContext(claim.quote, text);
    const effectiveContext = detectedContext || claim.context;

    // If context is historical, quoted, or hypothetical, no dependency created on current facts
    if (effectiveContext !== 'current') {
      findings.push({
        kind: 'claim',
        status: 'supported',
        severity: 'info',
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Historical or contextual claim (${effectiveContext}): no dependency created on current facts.`,
        suggested_fix: null,
        link_status: null,
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

    // Check for conflicting sources (multiple active sources sharing fact_key)
    const distinctSources = Array.from(new Set(matchedSources.map(s => s.source_id)));
    if (distinctSources.length > 1) {
      findings.push({
        kind: 'claim',
        status: 'conflicting_evidence',
        severity: 'blocker',
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Conflicting sources exist for key "${claim.fact_key}".`,
        suggested_fix: 'Escalate to the knowledge owner to resolve multiple competing sources.',
        link_status: null,
      });
      continue;
    }

    const source = matchedSources[0];

    // Check effective_from: future sources are not yet active
    if (source.effective_from && new Date(source.effective_from) > asOfDate) {
      findings.push({
        kind: 'claim',
        status: 'unverifiable',
        severity: 'warning',
        source_version_id: source.id,
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Source "${source.title}" v${source.version} is not yet effective (effective from ${new Date(source.effective_from).toISOString().slice(0, 10)}).`,
        suggested_fix: 'Check whether an earlier approved version applies or wait until effective date.',
        link_status: null,
      });
      continue;
    }

    // Check valid_until: expired sources
    if (source.valid_until && new Date(source.valid_until) < asOfDate) {
      const expDate = new Date(source.valid_until).toISOString().slice(0, 10);
      findings.push({
        kind: 'claim',
        status: 'expired_or_superseded',
        severity: 'blocker',
        source_version_id: source.id,
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Source "${source.title}" v${source.version} expired on ${expDate}.`,
        suggested_fix: 'Check the latest approved value with the source owner.',
        link_status: null,
      });
      continue;
    }

    // Check source status
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
    let claimNum = claim.number;
    if (claimNum === null) {
      claimNum = parseNumberWords(claim.quote);
    }
    const sourceNum = typeof source.value?.number === 'number' ? source.value.number : null;
    const sourceUnit = typeof source.value?.unit === 'string' ? source.value.unit : '';
    const sourceDisplay = String(source.value?.display || `${sourceNum} ${sourceUnit}`);

    const normClaim = normalizeValue(claimNum, claim.unit);
    const normSource = normalizeValue(sourceNum, sourceUnit);

    const isQualifier = hasQualifier(claim.quote, text);

    // Check derived annual value (12 * monthly price)
    const isDerivedAnnual =
      normClaim.unit === 'inr_per_year' &&
      normSource.unit === 'inr_per_user_month' &&
      normClaim.num !== null &&
      normSource.num !== null &&
      Math.abs(normClaim.num - normSource.num * 12) < 0.01;

    if (isDerivedAnnual) {
      findings.push({
        kind: 'claim',
        status: 'supported',
        severity: 'info',
        source_version_id: source.id,
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Derived annual calculation (${normClaim.num} = 12 × ${sourceDisplay}) from ${source.title} (v${source.version}). Probable link pending reviewer confirmation.`,
        suggested_fix: null,
        link_status: 'probable',
      });
      continue;
    }

    // Numbers match exactly
    const numbersMatch =
      normClaim.num !== null &&
      normSource.num !== null &&
      Math.abs(normClaim.num - normSource.num) < 0.0001;

    if (numbersMatch) {
      if (isQualifier) {
        findings.push({
          kind: 'claim',
          status: 'supported',
          severity: 'info',
          source_version_id: source.id,
          quote: claim.quote,
          start_idx: claim.start_idx,
          end_idx: claim.end_idx,
          explanation: `Matches approved ${source.title} (v${source.version}): ${sourceDisplay}, but contains qualifier wording. Probable link.`,
          suggested_fix: null,
          link_status: 'probable',
        });
      } else {
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
      }
    } else if (isQualifier) {
      // Qualifier with non-identical number (e.g. "more than Rs. 300")
      findings.push({
        kind: 'claim',
        status: 'supported',
        severity: 'info',
        source_version_id: source.id,
        quote: claim.quote,
        start_idx: claim.start_idx,
        end_idx: claim.end_idx,
        explanation: `Asserts qualifier claim "${claim.quote}" relative to approved ${source.title} (v${source.version}: ${sourceDisplay}). Probable link.`,
        suggested_fix: null,
        link_status: 'probable',
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
