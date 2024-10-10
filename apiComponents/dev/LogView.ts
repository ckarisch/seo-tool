import { NextResponse } from "next/server"

export const LogView = (logs: any, title = 'logs') => {
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
      pre {
        padding: 15px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .log-entry {
        margin-bottom: 10px;
        padding: 8px;
        border-left: 4px solid #ccc;
      }
      .log-entry.error { border-left-color: #ff4444; }
      .log-entry.warn { border-left-color: #ffbb33; }
      .log-entry.info { border-left-color: #33b5e5; }
    </style>
    <style>
    .code-viewer {
      max-width: 800px;
      margin: 20px auto;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .window {
      background: #1e1e1e;
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
      max-height: 400px;
      overflow: auto;
    }

    pre {
      margin: 0;
      color: #fff;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-all;
    }
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
        <pre id="json">${logs.join(' <br />')}</pre>
      </div>
    </div>
  </div>
    <script>
      // Optional: Add interactive features like filtering, searching, etc.
    </script>
  </body>
</html>
`

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
        }
    })
}