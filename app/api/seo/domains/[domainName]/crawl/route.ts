import { getServerSession } from 'next-auth';
import { crawlDomain, crawlDomainResponse } from './crawlDomain';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import { createLogger } from '@/apiComponents/dev/logger';
import { LogEntry, streamLogs } from '@/apiComponents/dev/StreamingLogViewer';
import { NextResponse } from 'next/server';

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
  let resolveFinalResponse: (value: crawlDomainResponse | undefined) => void;
  const generatorResponsePromise = new Promise<crawlDomainResponse | undefined>(resolve => {
    resolveFinalResponse = resolve;
  });

  const stream = new ReadableStream({
    async start(controller) {
      async function* generateLogs(): AsyncGenerator<LogEntry, void, unknown> {
        const crawlRequestLogger = createLogger('Crawl Request');
        yield* crawlRequestLogger.log('crawl request');


        /* subfunction */
        const subfunctionGenerator = crawlDomain(
          params.domainName,
          depth,
          followLinks,
          maxExecutionTime
        );

        let result: IteratorResult<LogEntry, crawlDomainResponse>;
        do {
          result = await subfunctionGenerator.next();
          if (!result.done) {
            yield result.value;
          }
        } while (!result.done);

        let subfunctionResult: crawlDomainResponse | undefined = undefined;
        subfunctionResult = result.value;
        resolveFinalResponse(result.value);
        /* end subfunction */

        controller.close();
      }
      
      for await (const logEntry of generateLogs()) {
        const encodedChunk = encoder.encode(JSON.stringify(logEntry) + '\n');
        controller.enqueue(encodedChunk);
      }
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
  const finalResponse = await generatorResponsePromise;

  if (finalResponse) {
    return NextResponse.json(finalResponse);
  } else {
    // If for some reason finalResponse is not set, return an error
    return Response.json({ error: "Crawl did not complete successfully" }, { status: 500 });
  }
}