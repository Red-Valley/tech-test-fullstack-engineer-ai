import { hasGoogleApiKey, getGeminiModel } from '../src/lib/ai/provider.js';
import { CATALOG_SYSTEM_PROMPT } from '../src/lib/ai/system-prompt.js';
import { catalogTools } from '../src/lib/ai/tools.js';
import { streamText, stepCountIs } from 'ai';

// Load .env automatically in Node 24 if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Optional Live Integration Test for Google Gemini 3.8 Flash.
 * Executed only when explicitly run via `npm run test:live` and a valid API key is present.
 * Does not run as part of normal `npm test` and does not consume quota unless authorized.
 */
async function runLiveChatTest() {
  console.log('=== Google Gemini 3.8 Flash Live Integration Test ===');

  if (!hasGoogleApiKey()) {
    console.log(
      '⚠️  SKIPPED: No GOOGLE_GENERATIVE_AI_API_KEY configured in environment.'
    );
    console.log('To run this live test, add a valid API key to .env.local:');
    console.log('GOOGLE_GENERATIVE_AI_API_KEY=your_key_here');
    process.exit(0);
  }

  try {
    console.log('✓ API Key detected. Initializing gemini-3.8-flash model...');
    const model = getGeminiModel('gemini-3.8-flash');

    const testQueries = [
      'Which game made the most revenue last month?',
      'How many games are rated above 4?',
      'Compare revenue of Celeste vs Hollow Knight.',
    ];

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`\n[Question ${i + 1}]: "${query}"`);

      const result = streamText({
        model,
        system: CATALOG_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: query }],
        tools: catalogTools,
        stopWhen: stepCountIs(5),
      });

      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      console.log(`Response length: ${fullText.length} chars`);
      console.log(`Excerpt: ${fullText.slice(0, 150)}...`);
    }

    console.log('\n✓ Live integration test completed successfully!');
  } catch (error) {
    console.error('❌ Live test error:', error);
    process.exit(1);
  }
}

runLiveChatTest();
