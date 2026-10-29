import type { NextApiRequest, NextApiResponse } from 'next';

interface ExplainRequestBody {
  nodeLabel?: string;
  category?: string;
  fileOrigin?: string;
  symbols?: string[];
  upstream?: string[];
  downstream?: string[];
  engine?: 'openai' | 'local' | 'deterministic';
}

type ExplainResponse =
  | { explanation: string; provider: string; model: string; durationMs: number }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExplainResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const startTime = performance.now();
  const body = (req.body || {}) as ExplainRequestBody;
  if (
    typeof body.nodeLabel !== 'string' ||
    typeof body.category !== 'string' ||
    typeof body.fileOrigin !== 'string'
  ) {
    return res.status(400).json({ error: 'nodeLabel, category, and fileOrigin are required.' });
  }

  const symbols = Array.isArray(body.symbols) ? body.symbols.filter((item): item is string => typeof item === 'string') : [];
  const upstream = Array.isArray(body.upstream) ? body.upstream.filter((item): item is string => typeof item === 'string') : [];
  const downstream = Array.isArray(body.downstream) ? body.downstream.filter((item): item is string => typeof item === 'string') : [];
  const engine = body.engine || 'deterministic';
  const durationMs = () => Math.round((performance.now() - startTime) * 100) / 100;

  if (engine === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OpenAI explanations require OPENAI_API_KEY.' });
    }
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Explain only the supplied static-analysis evidence. If a fact is not provided, state that it was not determined.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                label: body.nodeLabel,
                category: body.category,
                file: body.fileOrigin,
                symbols,
                upstream,
                downstream,
              }),
            },
          ],
          max_tokens: 150,
          temperature: 0.2,
        }),
      });
      if (!response.ok) {
        return res.status(502).json({ error: `OpenAI request failed (${response.status} ${response.statusText}).` });
      }
      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      const explanation = data.choices?.[0]?.message?.content?.trim();
      if (!explanation) return res.status(502).json({ error: 'OpenAI returned no explanation text.' });
      return res.status(200).json({ explanation, provider: 'OpenAI', model: 'gpt-4o', durationMs: durationMs() });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown OpenAI request failure';
      return res.status(502).json({ error: `OpenAI request failed: ${message}` });
    }
  }

  if (engine === 'local') {
    const localEndpoint = process.env.LOCAL_LLM_ENDPOINT;
    if (!localEndpoint) {
      return res.status(503).json({ error: 'Local explanations require LOCAL_LLM_ENDPOINT.' });
    }
    try {
      const response = await fetch(`${localEndpoint.replace(/\/+$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: `Explain only this static-analysis evidence. Label: ${body.nodeLabel}; category: ${body.category}; file: ${body.fileOrigin}; upstream: ${upstream.join(', ') || 'none detected'}; downstream: ${downstream.join(', ') || 'none detected'}; symbols: ${symbols.join(', ') || 'none detected'}.`,
          stream: false,
        }),
      });
      if (!response.ok) {
        return res.status(502).json({ error: `Local model request failed (${response.status} ${response.statusText}).` });
      }
      const data = await response.json() as { response?: string };
      const explanation = data.response?.trim();
      if (!explanation) return res.status(502).json({ error: 'Local model returned no explanation text.' });
      return res.status(200).json({ explanation, provider: 'Local model', model: 'llama3', durationMs: durationMs() });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown local model request failure';
      return res.status(502).json({ error: `Local model request failed: ${message}` });
    }
  }

  const connections = [
    upstream.length > 0 ? `Observed dependencies: ${upstream.join(', ')}.` : 'No upstream module dependency was detected.',
    downstream.length > 0 ? `Observed dependents: ${downstream.join(', ')}.` : 'No downstream dependent was detected.',
  ];
  const symbolText = symbols.length > 0
    ? ` Parsed declarations include ${symbols.slice(0, 4).join(', ')}.`
    : ' No symbols were attached to this node.';
  return res.status(200).json({
    explanation: `${body.nodeLabel} is a ${body.category} node associated with ${body.fileOrigin}.${symbolText} ${connections.join(' ')}`,
    provider: 'Deterministic AST summary',
    model: 'Static analysis',
    durationMs: durationMs(),
  });
}
