const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'docs', 'gold', 'GOLD_CASES.md'), 'utf-8');

const detectionCases = [];
const reopenCases = [];

const lines = content.split('\n');
let currentCase = null;
let section = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.includes('## DETECTION CASES')) {
    section = 'detection';
    continue;
  }
  if (line.includes('## REVALIDATION END-TO-END SUBSET')) {
    if (currentCase && section === 'detection') {
      detectionCases.push(currentCase);
      currentCase = null;
    }
    section = 'reopen';
    continue;
  }
  if (line.includes('## GOVERNANCE CASES')) {
    section = 'governance';
    continue;
  }
  if (line.includes('## SECURITY / RELIABILITY CASES')) {
    section = 'security';
    continue;
  }

  const tcMatch = line.match(/^\*\*(TC-\d+)\*\*/);
  if (tcMatch) {
    if (currentCase) {
      if (section === 'detection') detectionCases.push(currentCase);
    }
    currentCase = {
      id: tcMatch[1],
      section: section,
      text: '',
      fact_key: null,
      context: 'current',
      number: null,
      unit: null,
      gold_link_status: null,
      should_reopen: false,
      category: '',
      notes: '',
    };
    continue;
  }

  if (currentCase) {
    if (line.startsWith('- text:')) {
      const match = line.match(/^- text:\s*"(.*)"/);
      if (match) currentCase.text = match[1];
      else currentCase.text = line.replace(/^- text:\s*/, '').replace(/^"|"$/g, '');
    } else if (line.startsWith('- fact_key:')) {
      const val = line.replace(/^- fact_key:\s*/, '');
      const parts = val.split(',').map(s => s.trim());
      for (const p of parts) {
        if (p.startsWith('context:')) {
          currentCase.context = p.replace(/^context:\s*/, '');
        } else if (p.startsWith('number:')) {
          currentCase.number = parseFloat(p.replace(/^number:\s*/, ''));
        } else if (p.startsWith('unit:')) {
          currentCase.unit = p.replace(/^unit:\s*/, '');
        } else if (!p.includes(':')) {
          currentCase.fact_key = p === 'null' ? null : p;
        }
      }
    } else if (line.startsWith('- gold_link_status:')) {
      const val = line.replace(/^- gold_link_status:\s*/, '');
      const parts = val.split(',').map(s => s.trim());
      for (const p of parts) {
        if (p.startsWith('should_reopen:')) {
          currentCase.should_reopen = p.includes('true');
        } else {
          currentCase.gold_link_status = p.includes('confirmed')
            ? 'confirmed'
            : p.includes('probable')
            ? 'probable'
            : null;
        }
      }
    } else if (line.startsWith('- category:')) {
      currentCase.category = line.replace(/^- category:\s*/, '');
    } else if (line.startsWith('- notes:')) {
      currentCase.notes = line.replace(/^- notes:\s*/, '');
    }
  }

  // Parse REV cases
  const revMatch = line.match(/^\*\*(REV-\d+)\*\*:\s*(.*)/);
  if (revMatch) {
    const revId = revMatch[1];
    const desc = revMatch[2];
    const shouldReopen = desc.toUpperCase().includes('REOPEN') && !desc.toUpperCase().includes('NO REOPEN');
    reopenCases.push({
      id: revId,
      description: desc,
      should_reopen: shouldReopen,
    });
  }
}

if (currentCase && section === 'detection') {
  detectionCases.push(currentCase);
}

fs.writeFileSync(
  path.join(__dirname, '..', 'tests', 'gold', 'detection.json'),
  JSON.stringify(detectionCases, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(__dirname, '..', 'tests', 'gold', 'reopen.json'),
  JSON.stringify(reopenCases, null, 2),
  'utf-8'
);

console.log(`✅ Transcribed ${detectionCases.length} detection cases and ${reopenCases.length} reopen cases.`);
