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

  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Console with Conditional Auto-scroll</title>
    <meta charset="utf-8">
    <style>
      body { 
        font-family: monospace;
        padding: 20px;
        background: #f5f5f5;
      }
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
        justify-content: space-between;
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
      .time-info {
        color: #fff;
        font-size: 14px;
        display: flex;
        gap: 20px;
      }
      .code-content {
        padding: 16px;
        max-height: 400px;
        overflow: auto;
      }
      pre {
        margin: 0;
        color: #ffffff;
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
      .auto-scroll-status {
        color: #fff;
        font-size: 12px;
        margin-top: 5px;
        padding: 1px;
      }
    </style>
  </head>
  <body>
    <h1>Console with Conditional Auto-scroll</h1>
    <div class="code-viewer">
      <div class="window">
        <div class="window-header">
          <div class="window-buttons">
            <div class="window-button button-red"></div>
            <div class="window-button button-yellow"></div>
            <div class="window-button button-green"></div>
          </div>
          <div class="time-info">
            <div>Started: <span id="startTime"></span></div>
            <div>Time passed: <span id="elapsedTime"></span></div>
          </div>
        </div>
        <div class="code-content" id="codeContent">
          <pre id="logContent"></pre>
        </div>
        <div class="auto-scroll-status" id="scrollStatus"></div>
      </div>
    </div>
    <script>
      const logContent = document.getElementById('logContent');
      const codeContent = document.getElementById('codeContent');
      const startTimeElement = document.getElementById('startTime');
      const elapsedTimeElement = document.getElementById('elapsedTime');
      const scrollStatusElement = document.getElementById('scrollStatus');
      
      const startTime = new Date();
      let autoScroll = true;
      let isScrolling = false;
      let scrollTimeout;

      function isUserNearBottom() {
        const threshold = 50; // pixels from bottom
        const scrollPosition = codeContent.scrollTop + codeContent.clientHeight;
        const totalHeight = codeContent.scrollHeight;
        return totalHeight - scrollPosition <= threshold;
      }

      function appendLog(text, level = 'info') {
        const line = document.createElement('div');
        line.textContent = text;
        line.className = \`log-entry \${level}\`;
        logContent.appendChild(line);
        
        // Only auto-scroll if we were already near the bottom
        if (autoScroll && isUserNearBottom()) {
          // Use requestAnimationFrame for smooth scrolling
          requestAnimationFrame(() => {
            scrollToBottom();
          });
        }
      }

      function scrollToBottom() {
        if (!isScrolling) {
          isScrolling = true;
          codeContent.scrollTop = codeContent.scrollHeight;
          // Reset scrolling flag after animation
          requestAnimationFrame(() => {
            isScrolling = false;
          });
        }
      }

      function updateTimes() {
        const now = new Date();
        const elapsed = now - startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        startTimeElement.textContent = startTime.toLocaleTimeString();
        elapsedTimeElement.textContent = 
          \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
      }

      function updateScrollStatus() {
        scrollStatusElement.textContent = autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF (Press Space to resume)';
      }

      // Debounced scroll handler
      function handleScroll() {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(() => {
          // Only update auto-scroll if user has scrolled away from bottom
          if (!isUserNearBottom() && autoScroll) {
            autoScroll = false;
            updateScrollStatus();
          } else if (isUserNearBottom() && !autoScroll) {
            autoScroll = true;
            updateScrollStatus();
          }
        }, 150); // Debounce time
      }

      // Update times every second
      setInterval(updateTimes, 1000);

      // Improved scroll detection
      codeContent.addEventListener('scroll', handleScroll);

      // Detect space key press with improved handling
      document.addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
          event.preventDefault(); // Prevent page scroll
          autoScroll = true;
          updateScrollStatus();
          requestAnimationFrame(() => {
            scrollToBottom();
          });
        }
      });

      // Initial updates
      updateTimes();
      updateScrollStatus();
    </script>
  </body>
</html>`;
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
            yield { text: \`Processing batch \${i}...\`, delay: 1000 }
            
            if (i === 2) {
              yield { text: 'Warning: High memory usage detected', level: 'warn', delay: 500 }
            }
            
            if (i === 4) {
              yield { text: 'Error: Failed to connect to database', level: 'error', delay: 500 }
            }
            
            yield { text: \`Batch \${i} completed\`, delay: 500 }
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