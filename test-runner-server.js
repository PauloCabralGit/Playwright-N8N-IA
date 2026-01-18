const express = require('express');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

const PORT = process.env.RUNNER_PORT || 9998;
const EXPECTED_API_KEY = process.env.RUNNER_API_KEY || '';
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Enforce API key in this deployment: fail fast if not provided to avoid
// accidental exposure of the runner. For local development, set RUNNER_API_KEY.
if (!EXPECTED_API_KEY) {
  console.error('FATAL: RUNNER_API_KEY is not set. Set RUNNER_API_KEY in the environment to start the runner.');
  process.exit(1);
}

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

// In-memory store for executions
const executions = new Map();

function requireApiKey(req, res, next) {
  if (!EXPECTED_API_KEY) {
    // No API key configured — allow for local/dev usage but warn
    console.warn('RUNNER_API_KEY not set — skipping auth (not recommended in production)');
    return next();
  }

  const auth = req.get('authorization') || req.get('Authorization') || '';
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = auth.slice('Bearer '.length).trim();
  if (token !== EXPECTED_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  return next();
}

app.get('/', (req, res) => {
  res.json({ message: 'Playwright test-runner', version: '1.0.0' });
});

// Start a new test run. Body can contain an env map which will be used as env vars.
app.post('/run-tests', requireApiKey, (req, res) => {
  try {
    const payload = req.body || {};
    const executionId = uuidv4();
    const startTime = new Date().toISOString();

    const record = {
      id: executionId,
      status: 'queued',
      payload,
      startTime,
      endTime: null,
      exitCode: null,
      stdout: '',
      stderr: '',
      message: null,
    };
    executions.set(executionId, record);

    // Start asynchronously
    runPlaywright(executionId, payload).catch((err) => {
      const r = executions.get(executionId) || {};
      r.status = 'failed';
      r.message = String(err);
      r.endTime = new Date().toISOString();
      executions.set(executionId, r);
    });

    res.status(202).json({ execution_id: executionId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/current-status', (req, res) => {
  const running = Array.from(executions.values()).some((e) => e.status === 'running' || e.status === 'queued');
  res.json({ running });
});

app.get('/execution-details/:id', requireApiKey, (req, res) => {
  const id = req.params.id;
  if (!executions.has(id)) return res.status(404).json({ error: 'Not found' });
  res.json(executions.get(id));
});

app.get('/list-executions', requireApiKey, (req, res) => {
  const list = Array.from(executions.values()).map((e) => ({ id: e.id, status: e.status, startTime: e.startTime, endTime: e.endTime }));
  res.json(list);
});

async function runPlaywright(executionId, payload) {
  const record = executions.get(executionId);
  if (!record) throw new Error('Execution record not found');

  record.status = 'running';
  executions.set(executionId, record);

  // Build environment
  const env = Object.assign({}, process.env);
  if (payload && payload.env && typeof payload.env === 'object') {
    for (const k of Object.keys(payload.env)) {
      env[k] = payload.env[k];
    }
  }

  // Default command: run playwright tests and output JSON reporter
  // Prefer the local binary under node_modules/.bin; fall back to npx when needed.
  const isWin = process.platform === 'win32';
  const localBin = path.join(process.cwd(), 'node_modules', '.bin', isWin ? 'playwright.cmd' : 'playwright');
  let child;
  if (fs.existsSync(localBin)) {
    child = spawn(localBin, ['test', '--reporter=json'], { env, shell: true });
  } else {
    const npxCmd = isWin ? 'npx.cmd' : 'npx';
    child = spawn(npxCmd, ['playwright', 'test', '--reporter=json'], { env, shell: true });
  }

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (chunk) => {
    const r = executions.get(executionId);
    r.stdout += chunk;
    executions.set(executionId, r);
  });

  child.stderr.on('data', (chunk) => {
    const r = executions.get(executionId);
    r.stderr += chunk;
    executions.set(executionId, r);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code));
  });

  const endTime = new Date().toISOString();
  const r = executions.get(executionId) || {};
  r.exitCode = exitCode;
  r.endTime = endTime;
  r.status = exitCode === 0 ? 'completed' : 'failed';
  r.message = `Process exited with code ${exitCode}`;

  // If Playwright generated a report directory, zip it for download by CI
  try {
    const reportDir = path.resolve('playwright-report');
    if (fs.existsSync(reportDir) && fs.statSync(reportDir).isDirectory()) {
      const outDir = path.resolve('reports');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const zipPath = path.join(outDir, `execution-${executionId}-report.zip`);
      const zip = new AdmZip();
      // add directory recursively
      const addFolder = (folder, zipFolder) => {
        const items = fs.readdirSync(folder);
        items.forEach((name) => {
          const full = path.join(folder, name);
          const rel = path.relative(reportDir, full);
          if (fs.statSync(full).isDirectory()) {
            addFolder(full, path.join(zipFolder, name));
          } else {
            zip.addLocalFile(full, zipFolder);
          }
        });
      };
      addFolder(reportDir, '');
      zip.writeZip(zipPath);
      r.reportPath = zipPath;
    }
  } catch (err) {
    console.warn('Failed to generate report zip:', err);
  }

  executions.set(executionId, r);
  return r;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test runner server listening on http://0.0.0.0:${PORT}`);
});

// Endpoint to download generated report zip for an execution
app.get('/execution-report/:id', requireApiKey, (req, res) => {
  const id = req.params.id;
  const record = executions.get(id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (!record.reportPath) return res.status(404).json({ error: 'Report not available' });
  const full = path.resolve(record.reportPath);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Report file missing' });
  res.download(full);
});

// Graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
