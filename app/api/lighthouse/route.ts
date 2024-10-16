import { NextResponse } from "next/server";

async function getPageSpeedInsights(url: string) {
    const apiKey = process.env.PAGE_SPEED_INSIGHTS_API_KEY;
    if (!apiKey) {
        throw new Error('api key undefined');
    }
    const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent('https://' + url)}&key=${encodeURIComponent(apiKey)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch PageSpeed Insights');
    }

    const data = await response.json();
    // console.log(data); // Verarbeiten Sie die Daten wie benötigt
    return data;
}


// To handle a GET request to /api
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    console.log(searchParams);
    const url = searchParams.get('url'); // Die URL, die auditiert werden soll, aus der Anfrage holen

    if (!url) {
        return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }


    const data = await getPageSpeedInsights(url);

    return NextResponse.json(data, { status: 200 });
}

// To handle a POST request to /api
// export async function POST(request) {
//     // Do whatever you want
//     return NextResponse.json({ message: "Hello World" }, { status: 200 });
// }