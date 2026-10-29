import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';

export default function VisualizerApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SYNAPSE // Code-to-Architecture Visualizer & Live Explainer</title>
        <meta
          name="description"
          content="Enterprise interactive AST code-to-architecture visualizer, dependency mapper, and live LLM explainer."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>" />
      </Head>
      <div className="min-h-screen bg-editorial-pink text-editorial-ink selection:bg-editorial-ink selection:text-editorial-pink antialiased font-editorial">
        <Component {...pageProps} />
      </div>
    </>
  );
}
