import { getServerSession } from 'next-auth';
import { crawlDomain } from './crawlDomain';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import { createLogger } from '@/apiComponents/dev/logger';
import { LogEntry, streamLogs } from '@/apiComponents/dev/StreamingLogViewer';

export const maxDuration = 60; // in seconds

export async function POST(
  request: Request,
  { params }: { params: { domainName: string } }
) {

  console.log('New crawl request: ' + params.domainName);
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log('error: no session')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }

  const depth = 1;
  const followLinks = true;
  const maxExecutionTime = 180000; // in milliseconds
  const encoder = new TextEncoder();
  let resolveFinalResponse: (value: Response | undefined) => void;
  const finalResponsePromise = new Promise<Response | undefined>(resolve => {
    resolveFinalResponse = resolve;
  });

  const stream = new ReadableStream({
    async start(controller) {
      async function* generateLogs(): AsyncGenerator<LogEntry, void, unknown> {
        const crawlRequestLogger = createLogger('Crawl Request');
        const crawlGenerator = crawlDomain(
          params.domainName,
          depth,
          followLinks,
          maxExecutionTime
        )(crawlRequestLogger);

        let result: IteratorResult<LogEntry, Response>;
        do {
          result = await crawlGenerator.next();
          if (!result.done) {
            yield result.value;
          }
        } while (!result.done);

        // Resolve the promise with the final Response object
        resolveFinalResponse(result.value);
      }

      for await (const logEntry of generateLogs()) {
        const encodedChunk = encoder.encode(JSON.stringify(logEntry) + '\n');
        controller.enqueue(encodedChunk);
      }

      controller.close();
    }
  });

  // Create a new response with the stream
  const streamResponse = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });

  // Wait for the stream to complete and finalResponse to be resolved
  const finalResponse = await finalResponsePromise;

  if (finalResponse) {
    // Combine the stream response headers with the finalResponse
    const combinedHeaders = new Headers(streamResponse.headers);
    for (const [key, value] of finalResponse.headers.entries()) {
      combinedHeaders.set(key, value);
    }

    // Create a new response with the combined headers and the body of finalResponse
    return new Response(finalResponse.body, {
      status: finalResponse.status,
      statusText: finalResponse.statusText,
      headers: combinedHeaders,
    });
  } else {
    // If for some reason finalResponse is not set, return an error
    return Response.json({ error: "Crawl did not complete successfully" }, { status: 500 });
  }
}