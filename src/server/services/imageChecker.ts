import { z } from 'zod';
import { db } from '@/server/db/client';

/** Minimal hex-distance in RGB space */
function hexDistance(a: string, b: string): number {
  const parse = (h: string) => {
    const c = h.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

/** Linearise an 8-bit channel value per WCAG */
function channelLuminance(val: number): number {
  const v = val / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.1 */
export function computeRelativeLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG contrast ratio between two hex colours */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = computeRelativeLuminance(hex1);
  const l2 = computeRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns true if `hex` is within `tolerance` RGB units of any approved colour */
export function isApprovedColour(hex: string, approvedHex: string[], tolerance: number): boolean {
  return approvedHex.some(a => hexDistance(a, hex) <= tolerance);
}

export interface ImageRegionFinding {
  kind: 'palette_off_brand' | 'contrast_below_aa' | 'logo_missing' | 'text_unreadable';
  severity: 'info' | 'warning' | 'blocker';
  region_x: number | null;
  region_y: number | null;
  region_w: number | null;
  region_h: number | null;
  explanation: string;
  hex_found?: string | null;
  hex_expected?: string | null;
  contrast_ratio?: number | null;
}

/** Gemini vision schema for image analysis */
const geminiImageSchema = z.object({
  regions: z.array(z.object({
    kind: z.enum(['palette_off_brand', 'contrast_below_aa', 'logo_missing', 'text_unreadable']),
    region_x: z.number().min(0).max(1).nullable().optional(),
    region_y: z.number().min(0).max(1).nullable().optional(),
    region_w: z.number().min(0).max(1).nullable().optional(),
    region_h: z.number().min(0).max(1).nullable().optional(),
    hex_found: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    hex_expected: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    explanation: z.string(),
  }))
});

/**
 * Analyse an image (base64 PNG/JPG) against brand palette and contrast thresholds.
 * Returns deterministic findings. If Gemini is available, it also locates problem regions.
 * Always returns a result — Gemini failure degrades to deterministic-only mode.
 */
export async function analyseImage(
  workspaceId: string,
  contentVersionId: string,
  imageBase64: string,
  mimeType: 'image/png' | 'image/jpeg',
  approvedHex: string[],
  tolerance: number,
  minContrastRatio: number
): Promise<ImageRegionFinding[]> {
  const findings: ImageRegionFinding[] = [];
  let geminiRegions: z.infer<typeof geminiImageSchema>['regions'] = [];
  let aiAvailable = false;

  // 1. Try Gemini vision for region localisation
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genai = new GoogleGenerativeAI(apiKey);
      const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const paletteList = approvedHex.join(', ');
      const prompt = `You are a brand compliance inspector. Analyse this image for:
1. Colours not matching the approved palette (${paletteList}, tolerance ~${tolerance} RGB units).
2. Text regions with contrast ratio below ${minContrastRatio}:1 (WCAG AA).
3. Any logo that appears distorted, absent, or unapproved.
4. Any text that is illegible due to low contrast or small size.

For each issue, return normalised coordinates (0-1 range, top-left origin) of the bounding box region.

Respond ONLY with valid JSON matching this schema:
{
  "regions": [
    {
      "kind": "palette_off_brand" | "contrast_below_aa" | "logo_missing" | "text_unreadable",
      "region_x": number | null,
      "region_y": number | null,
      "region_w": number | null,
      "region_h": number | null,
      "hex_found": "#rrggbb" | null,
      "hex_expected": "#rrggbb or null",
      "explanation": "short plain-language explanation"
    }
  ]
}
If no issues found, return { "regions": [] }.`;

      const timer = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini vision timed out')), 25000)
      );

      const result = await Promise.race([
        model.generateContent([
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } }
        ]),
        timer
      ]);

      const raw = result.response.text().trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = geminiImageSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (parsed.success) {
          geminiRegions = parsed.data.regions;
          aiAvailable = true;
        }
      }
    } catch (err) {
      console.warn('Gemini vision failed, using deterministic-only mode:', err);
    }
  }

  // 2. Convert Gemini regions → findings (code assigns severity, not the model)
  for (const region of geminiRegions) {
    if (region.kind === 'contrast_below_aa' && region.hex_found && region.hex_expected) {
      // Deterministically verify contrast — skip model false-positives
      const ratio = contrastRatio(region.hex_found, region.hex_expected);
      if (ratio >= minContrastRatio) continue;
      findings.push({
        kind: 'contrast_below_aa',
        severity: 'blocker',
        region_x: region.region_x ?? null,
        region_y: region.region_y ?? null,
        region_w: region.region_w ?? null,
        region_h: region.region_h ?? null,
        explanation: region.explanation,
        hex_found: region.hex_found,
        hex_expected: region.hex_expected,
        contrast_ratio: ratio,
      });
    } else if (region.kind === 'palette_off_brand' && region.hex_found) {
      // Deterministically verify palette — skip model false-positives
      if (isApprovedColour(region.hex_found, approvedHex, tolerance)) continue;
      findings.push({
        kind: 'palette_off_brand',
        severity: 'warning',
        region_x: region.region_x ?? null,
        region_y: region.region_y ?? null,
        region_w: region.region_w ?? null,
        region_h: region.region_h ?? null,
        explanation: region.explanation,
        hex_found: region.hex_found,
        hex_expected: approvedHex[0],
      });
    } else {
      // logo_missing and text_unreadable: code assigns severity
      let severity: 'info' | 'warning' | 'blocker' = 'warning';
      if (region.kind === 'contrast_below_aa') severity = 'blocker';
      else if (region.kind === 'logo_missing') severity = 'blocker';
      else if (region.kind === 'palette_off_brand') severity = 'warning';
      else if (region.kind === 'text_unreadable') severity = 'warning';

      findings.push({
        kind: region.kind as ImageRegionFinding['kind'],
        severity,
        region_x: region.region_x ?? null,
        region_y: region.region_y ?? null,
        region_w: region.region_w ?? null,
        region_h: region.region_h ?? null,
        explanation: region.explanation,
        hex_found: region.hex_found ?? null,
        hex_expected: region.hex_expected ?? null,
      });
    }
  }

  // 3. Deterministic fallback message if no AI and no findings yet
  if (!aiAvailable && findings.length === 0) {
    findings.push({
      kind: 'text_unreadable',
      severity: 'info',
      region_x: null, region_y: null, region_w: null, region_h: null,
      explanation: 'AI vision unavailable — manual review required. Deterministic contrast check not possible without pixel data.',
    });
  }

  return findings;
}

/**
 * Persist image findings to DB and write audit_log
 */
export async function saveImageFindings(
  workspaceId: string,
  contentVersionId: string,
  findings: ImageRegionFinding[]
): Promise<void> {
  for (const f of findings) {
    await db(
      `INSERT INTO image_findings
        (content_version_id, workspace_id, kind, severity, region_x, region_y, region_w, region_h,
         explanation, hex_found, hex_expected, contrast_ratio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [contentVersionId, workspaceId, f.kind, f.severity,
       f.region_x, f.region_y, f.region_w, f.region_h,
       f.explanation, f.hex_found ?? null, f.hex_expected ?? null, f.contrast_ratio ?? null]
    );
  }

  if (findings.length > 0) {
    await db(
      `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
       VALUES ($1, 'system', 'image.analysed', 'content_version', $2, $3)`,
      [workspaceId, contentVersionId, JSON.stringify({ findings_count: findings.length })]
    );
  }
}

/**
 * Retrieve image findings for a content version
 */
export async function getImageFindings(
  workspaceId: string,
  contentVersionId: string
): Promise<Array<ImageRegionFinding & { id: string; created_at: string }>> {
  return await db<ImageRegionFinding & { id: string; created_at: string }>(
    `SELECT id, kind, severity, region_x, region_y, region_w, region_h,
            explanation, hex_found, hex_expected, contrast_ratio, created_at
     FROM image_findings
     WHERE content_version_id = $1 AND workspace_id = $2
     ORDER BY severity DESC, created_at ASC`,
    [contentVersionId, workspaceId]
  );
}
