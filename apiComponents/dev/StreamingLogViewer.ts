// components/StreamingLogViewer.tsx
import { NextResponse } from "next/server"

export interface StreamingLogViewerProps {
    title?: string;
    styles?: {
        background?: string;
        textColor?: string;
        maxHeight?: string;
        width?: string;
    };
}

export interface LogEntry {
    text: string;
    level?: 'info' | 'warn' | 'error';
    delay?: number;
}

const DEFAULT_STYLES = {
    background: '#1e1e1e',
    textColor: '#fff',
    maxHeight: '400px',
    width: '800px',
}

export function generateStreamingLogViewer(props: StreamingLogViewerProps = {}) {
    const {
        title = 'Streaming Logs',
        styles = {},
    } = props

    const finalStyles = { ...DEFAULT_STYLES, ...styles }

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8">
    <style>
      body { 
        font-family: monospace;
        padding: 20px;
        background: #f5f5f5;
      }
      .code-viewer {
        max-width: ${finalStyles.width};
        margin: 20px auto;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .window {
        background: ${finalStyles.background};
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      .window-header {
        background: #333;
        padding: 8px 16px;
        display: flex;
        align-items: center;
      }
      .window-buttons {
        display: flex;
        gap: 8px;
      }
      .window-button {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .button-red { background: #ff5f56; }
      .button-yellow { background: #ffbd2e; }
      .button-green { background: #27c93f; }
      .code-content {
        padding: 16px;
        max-height: ${finalStyles.maxHeight};
        overflow: auto;
      }
      pre {
        margin: 0;
        color: ${finalStyles.textColor};
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .log-entry {
        margin-bottom: 4px;
        padding: 2px 4px;
        border-radius: 2px;
      }
      .log-entry.error { background-color: rgba(255, 0, 0, 0.2); }
      .log-entry.warn { background-color: rgba(255, 165, 0, 0.2); }
      .log-entry.info { background-color: rgba(0, 255, 255, 0.1); }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="code-viewer">
      <div class="window">
        <div class="window-header">
          <div class="window-buttons">
            <div class="window-button button-red"></div>
            <div class="window-button button-yellow"></div>
            <div class="window-button button-green"></div>
          </div>
        </div>
        <div class="code-content">
          <pre id="logContent"></pre>
        </div>
      </div>
    </div>
    <script>
      const logContent = document.getElementById('logContent');
      
      function appendLog(text, level = 'info') {
        const line = document.createElement('div');
        line.textContent = text;
        line.className = \`log-entry \${level}\`;
        logContent.appendChild(line);
        logContent.scrollTop = logContent.scrollHeight;
      }
    </script>
  </body>
</html>
`
    return html
}

export async function streamLogs(
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    logGenerator: AsyncGenerator<LogEntry>
) {
    try {
        for await (const log of logGenerator) {
            const { text, level = 'info', delay = 100 } = log
            const script = `<script>appendLog("${text}", "${level}");</script>`
            controller.enqueue(encoder.encode(script))
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    } catch (error) {
        console.error('Error streaming logs:', error)
        controller.error(error)
    }
}

/* example usage */
/*
export async function GET(request: Request) {
    const encoder = new TextEncoder()
  
    const stream = new ReadableStream({
      async start(controller) {
        const html = generateStreamingLogViewer({
          title: 'Application Logs',
          styles: {
            maxHeight: '500px',
            width: '900px',
          }
        })
        controller.enqueue(encoder.encode(html))
  
        // Example log generator with correct typing
        async function* generateLogs(): AsyncGenerator<LogEntry> {
          yield { text: 'Starting application...' }
          
          for (let i = 1; i <= 5; i++) {
            yield { text: `Processing batch ${i}...`, delay: 1000 }
            
            if (i === 2) {
              yield { text: 'Warning: High memory usage detected', level: 'warn', delay: 500 }
            }
            
            if (i === 4) {
              yield { text: 'Error: Failed to connect to database', level: 'error', delay: 500 }
            }
            
            yield { text: `Batch ${i} completed`, delay: 500 }
          }
          
          yield { text: 'Application shutdown complete' }
        }
  
        await streamLogs(controller, encoder, generateLogs())
        controller.close()
      }
    })
  
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
}
*/