// Simple Node client to POST to the local test-runner using fetch (Node 18+)
const url = process.argv[2] || 'http://127.0.0.1:9998/run-tests';
const apiKey = process.env.RUNNER_API_KEY || 'test-key-123';

async function main() {
  try {
    const payload = { ambiente: 'preprod', env: { SF_URL: 'https://example/', SF_LOGIN: 'u', SF_PASSWORD: 'p' } };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    console.log('Status', resp.status);
    console.log(text);
  } catch (err) {
    console.error('Error calling runner:', err);
    process.exit(1);
  }
}

main();
