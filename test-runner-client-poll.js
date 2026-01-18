const fs = require('fs');
const path = require('path');

const RUNNER_URL = process.env.RUNNER_URL || 'http://127.0.0.1:9998';
const API_KEY = process.env.RUNNER_API_KEY || 'test-key-123';

async function postRun() {
  const payload = { ambiente: 'preprod', env: { SF_URL: 'https://example/', SF_LOGIN: 'u', SF_PASSWORD: 'p' } };
  const resp = await fetch(`${RUNNER_URL}/run-tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (resp.status !== 202) {
    const txt = await resp.text();
    throw new Error(`Failed to start run: ${resp.status} ${txt}`);
  }
  const j = await resp.json();
  return j.execution_id;
}

async function getDetails(id) {
  const resp = await fetch(`${RUNNER_URL}/execution-details/${id}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Failed to get details: ${resp.status} ${t}`);
  }
  return resp.json();
}

async function downloadReport(id) {
  const url = `${RUNNER_URL}/execution-report/${id}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
  if (resp.status === 200) {
    const outPath = path.resolve(`execution-${id}-report.zip`);
    // Node's global fetch in recent Node versions returns a WHATWG ReadableStream.
    // Read as arrayBuffer and write the buffer to disk for compatibility.
    const ab = await resp.arrayBuffer();
    fs.writeFileSync(outPath, Buffer.from(ab));
    return outPath;
  }
  return null;
}

// Support a mode to only download an existing execution report (useful for debugging)
if (process.env.DOWNLOAD_ONLY_ID) {
  const id = process.env.DOWNLOAD_ONLY_ID;
  downloadReport(id).then((p) => {
    if (p) console.log('Downloaded report to', p);
    else console.log('No report available for', id);
  }).catch((err) => { console.error('Download failed', err); process.exit(1); });
  return;
}

async function main() {
  console.log('Triggering run at', RUNNER_URL);
  const id = await postRun();
  console.log('Execution id:', id);

  let details;
  while (true) {
    details = await getDetails(id);
    console.log('Status:', details.status);
    if (details.status !== 'running' && details.status !== 'queued') break;
    await new Promise((r) => setTimeout(r, 3000));
  }

  const outJson = `execution-${id}.json`;
  fs.writeFileSync(outJson, JSON.stringify(details, null, 2), 'utf8');
  console.log('Saved details to', outJson);

  try {
    const zipPath = await downloadReport(id);
    if (zipPath) console.log('Downloaded report to', zipPath);
    else console.log('No report available for execution');
  } catch (err) {
    console.warn('Error downloading report:', err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
