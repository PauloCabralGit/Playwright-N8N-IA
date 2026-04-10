import { getN8nConfig, getN8nWebhookUrl } from '@/app/lib/n8n-config';
import type { NextRequest } from 'next/server';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(request: NextRequest) {
  const config = await getN8nConfig(request);
  const n8nWebhootUrl = await getN8nWebhookUrl(request);
  
  const payload = {
    github: {
      owner: config.githubOwner || "",
      repo: config.githubRepo || "",
      branch: config.githubBranch || "main",
      enabled: Boolean(config.githubToken),
    },
    n8n: {
      webhookBaseUrl: n8nWebhootUrl || "",
      enabled: Boolean(n8nWebhootUrl),
    },
  };

  return json(payload);
}
