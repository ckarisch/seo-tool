import { LogEntry } from '@/apiComponents/dev/logger';
import { crawlDomainPublicGenerator, crawlDomainPublicResponse } from './crawlDomainPublicGenerator';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // in seconds

export async function POST(
  request: Request,
  { params }: { params: { domainName: string } }
) {

  console.log('Public crawl request: ' + params.domainName);

  const depth = 2;
  const followLinks = true;
  const maxExecutionTime = 20000; // in milliseconds


  let resolveFinalResponse: (value: crawlDomainPublicResponse | undefined) => void;
  const generatorResponsePromise = new Promise<crawlDomainPublicResponse | undefined>(resolve => {
    resolveFinalResponse = resolve;
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {

      async function* generateLogs(): AsyncGenerator<LogEntry, void, unknown> {
        // const cronLogger = createLogger('CRAWL (public)');
        const crawlGenerator = crawlDomainPublicGenerator(params.domainName, depth, followLinks, maxExecutionTime)

        let result: IteratorResult<LogEntry, crawlDomainPublicResponse>;
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
  const finalResponse = await generatorResponsePromise;
  console.log('finalResponse', finalResponse)


  return NextResponse.json(finalResponse);

}