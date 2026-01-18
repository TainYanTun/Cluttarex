import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { ArticleData } from '@cluttarex/shared';

export const runtime = 'edge';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Cluttarex/1.0;)'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove basic clutter
    $('script, style, iframe, nav, footer, header, aside, noscript, svg, form, .ad').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No Title';

    // Heuristic for main content
    let contentNode = $('article');
    if (contentNode.length === 0) contentNode = $('main');
    if (contentNode.length === 0) contentNode = $('.content, .post-content');
    if (contentNode.length === 0) contentNode = $('body');

    const content = contentNode.html() || '';
    const textContent = contentNode.text().trim().substring(0, 500); // Small preview

    const article: ArticleData = {
      title,
      content,
      textContent,
      dir: $('html').attr('dir') || 'ltr'
    };

    const responseObj = NextResponse.json(article);
    
    // Add CORS headers
    responseObj.headers.set('Access-Control-Allow-Origin', '*');
    responseObj.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseObj.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return responseObj;

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
