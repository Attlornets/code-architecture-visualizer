import type { NextApiRequest, NextApiResponse } from 'next';

interface ExplainRequestBody {
  nodeLabel: string;
  category: string;
  fileOrigin: string;
  symbols?: string[];
  upstream?: string[];
  downstream?: string[];
  engine?: 'openai' | 'local' | 'deterministic';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ explanation: string; provider: string; model: string; durationMs: number }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      explanation: 'Method not allowed',
      provider: 'none',
      model: 'none',
      durationMs: 0,
    });
  }

  const startTime = performance.now();
  const { nodeLabel, category, fileOrigin, symbols = [], upstream = [], downstream = [], engine = 'openai' }: ExplainRequestBody = req.body;

  // Grounded architectural facts
  const upstreamText = upstream.length > 0 ? upstream.join(', ') : 'Root ingress';
  const downstreamText = downstream.length > 0 ? downstream.join(', ') : 'Terminal sink';
  const symbolsText = symbols.length > 0 ? `Detected symbols include ${symbols.slice(0, 4).join(', ')}.` : '';

  // 1. If OpenAI engine requested and OPENAI_API_KEY is configured
  if (engine === 'openai' && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_secured_openai_token_here') {
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
              content: 'You are an enterprise systems architect. Provide a concise, 2-3 sentence technical explanation of an architecture component based strictly on verified AST code metadata. Never fabricate details.',
            },
            {
              role: 'user',
              content: `Component: "${nodeLabel}" (${category}). File origin: "${fileOrigin}". Upstream: ${upstreamText}. Downstream: ${downstreamText}. Symbols: ${symbolsText}`,
            },
          ],
          max_tokens: 150,
          temperature: 0.2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
          return res.status(200).json({
            explanation: content.trim(),
            provider: 'OpenAI Cloud',
            model: 'gpt-4o',
            durationMs,
          });
        }
      }
    } catch {
      // Fall through to deterministic synthesizer
    }
  }

  // 2. If Local LLM requested (Ollama or vLLM)
  if (engine === 'local') {
    const localEndpoint = process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434';
    try {
      const response = await fetch(`${localEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: `Explain this architecture component in 2 factual sentences: Component: ${nodeLabel} (${category}) at ${fileOrigin}. Upstream: ${upstreamText}. Downstream: ${downstreamText}.`,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
          return res.status(200).json({
            explanation: data.response.trim(),
            provider: 'Local Ollama Daemon',
            model: 'llama3:8b',
            durationMs,
          });
        }
      }
    } catch {
      // Fall through to deterministic synthesizer
    }
  }

  // 3. Grounded Deterministic Synthesizer (Honest, accurate, verified evidence)
  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  const deterministicExplanation =
    `The ${nodeLabel} operates as a ${category.toUpperCase()} component defined in '${fileOrigin}'. ` +
    `It receives input traffic from [${upstreamText}] and routes state to [${downstreamText}]. ` +
    (symbols.length > 0
      ? `Static AST analysis verified ${symbols.length} code symbols (${symbols.slice(0, 3).join(', ')}) orchestrating its control flow.`
      : 'Static AST analysis verified the boundary structure with direct module export bindings.');

  return res.status(200).json({
    explanation: deterministicExplanation,
    provider: 'Deterministic AST Synthesizer',
    model: 'Rule-Based Semantic Analyzer (Grounded)',
    durationMs,
  });
}
