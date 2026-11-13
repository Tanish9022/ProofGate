import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { runEvaluation } from '../src/server/eval/runner';

async function main() {
  const result = await runEvaluation('00000000-0000-0000-0000-000000000000', {
    mode: 'deterministic',
    asOfDate: new Date('2026-11-09'),
  });

  console.log('✅ Evaluation Benchmark Run Finished!');
  console.log('Total Cases:', result.cases_count);
  console.log('Accuracy:', result.metrics.accuracy_display);
  console.log('Precision:', result.metrics.precision_display);
  console.log('Recall:', result.metrics.recall_display);
  console.log('F1 Score:', result.metrics.f1_display);
  console.log('TP / FP / FN / TN:', `${result.metrics.true_positives} / ${result.metrics.false_positives} / ${result.metrics.false_negatives} / ${result.metrics.true_negatives}`);

  const failures = result.results.filter(r => !r.pass);
  if (failures.length > 0) {
    console.log(`⚠️ ${failures.length} cases failed:`);
    for (const f of failures) {
      console.log(`- ${f.id}: gold_reopen=${f.gold_should_reopen}, observed_reopen=${f.observed_should_reopen}, status=${f.status}, link=${f.link_status}`);
      console.log(`  Text: "${f.text}"`);
      console.log(`  Explanation: ${f.explanation}`);
    }
  } else {
    console.log('🎉 100% of gold benchmark cases passed!');
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

