import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { ArticleData } from '@lite-read/shared';

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
        'User-Agent': 'Mozilla/5.0 (compatible; Lite-Read/1.0;)'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Aggressively remove unwanted elements
    const clutterSelectors = [
      'script', 'style', 'iframe', 'nav', 'footer', 'header', 'aside', 'noscript', 'svg', 
      'form', 'button', 'input', 'link', 'meta', 'textarea', 'select',
      '.ad', '.ads', '[class*="ad-"]', '[id*="ad-"]',
      '.menu', '[class*="menu"]', '[id*="menu"]',
      '.navbar', '.nav', '[class*="nav-"]',
      '.sidebar', '[class*="sidebar"]',
      '.banner', '[class*="banner"]',
      '.popup', '.modal', '.overlay',
      '.social', '.share', '[class*="share-"]',
      '.toc', '.table-of-contents', '[id*="toc"]',
      '.related', '.recommended', '.suggested', '.onward', '.journey',
      '.comment', '#comments', '.comments-area', '.comment-respond', '.comment-form',
      '.search', '[class*="search"]',
      '.breadcrumb', '.breadcrumbs',
      '.testimonial', '.testimonials', '.review', '.reviews', '.trustpilot-widget',
      '.cookie', '.consent', '.newsletter', '.subscription',
      '[data-component="links-block"]', '[data-testid="alaska"]', '[data-testid="ohio-section-outer-3"]',
      '.top-stories', '.more-from', '.popular-stories'
    ];
    $(clutterSelectors.join(', ')).remove();

    // Text-based filtering for stubborn elements (forms, replies, onward journey)
    const unwantedPhrases = [
      'leave a comment', 'leave a reply', 'cancel reply', 'post comment', 
      'required fields', 'email address will not be published', 
      'comment has been submitted', 'accept the privacy checkbox',
      'what our customers say', 'customer reviews', 'what people are saying',
      'more from the', 'more weekend picks', 'related stories', 'related topics'
    ];
    
    $('div, section, p, form, h2, h3, span, time').each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      
      // Remove specific phrases
      if (unwantedPhrases.some(phrase => text.includes(phrase))) {
        if (text.length < 500) {
          $(el).remove();
          return;
        }
      }

      // Remove relative timestamps (e.g. "9 hrs ago", "1 day ago")
      const relativeTimePattern = /^\d+\s+(hrs?|hours?|mins?|minutes?|days?)\s+ago$/i;
      if (relativeTimePattern.test(text)) {
        $(el).remove();
      }
    });

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No Title';

    // Try to find the main content
    let contentNode = $('main');
    if (contentNode.length === 0) contentNode = $('article');
    if (contentNode.length === 0) contentNode = $('[role="main"]');
    if (contentNode.length === 0) contentNode = $('.content, .post-content, .article-body');
    if (contentNode.length === 0) contentNode = $('body');

    // Heuristic: Remove elements that are likely navigation menus (high link density)
    contentNode.find('div, ul, section').each((_, el) => {
      const $el = $(el);
      const links = $el.find('a').length;
      const textLength = $el.text().trim().length;
      
      // If a block has many links compared to its text content, it's likely a menu
      if (links > 5 && textLength / links < 30) {
        $el.remove();
      }
    });

    // Clean up attributes
    contentNode.find('*').removeAttr('style').removeAttr('class').removeAttr('id').removeAttr('width').removeAttr('height');

    // Fix relative URLs and lazy loading
    const seenImages = new Set<string>();
    
    contentNode.find('img').each((_, el) => {
      const $el = $(el);
      let src = $el.attr('src');
      const dataSrc = $el.attr('data-src') || $el.attr('data-original');
      
      // Handle lazy loading
      if (!src && dataSrc) {
        src = dataSrc;
        $el.attr('src', src);
      }
      
      // Resolve relative URLs
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        try {
          const absoluteUrl = new URL(src, url).href;
          src = absoluteUrl;
          $el.attr('src', absoluteUrl);
        } catch (e) {
          // Keep original
        }
      }
      
      // Remove loading="lazy"
      $el.removeAttr('loading');

      if (!src) {
        $el.remove();
        return;
      }

      // Filter out small images, placeholders, and duplicates
      const srcLower = src.toLowerCase();
      const isPlaceholder = srcLower.includes('grey-placeholder') || 
                            srcLower.includes('transparent.gif') || 
                            srcLower.includes('pixel.gif') ||
                            $el.attr('aria-label') === 'image unavailable';

      if (isPlaceholder) {
        $el.remove();
        return;
      }

      // De-duplication Logic:
      // BBC and many news sites use a unique ID in the URL, e.g., .../live/ac649c90...
      // We try to extract a unique hash to prevent the same image appearing twice.
      const match = src.match(/\/([a-z0-9-]{10,})\.(jpg|jpeg|png|webp)/i);
      const imageId = match ? match[1] : src;

      if (seenImages.has(imageId)) {
        $el.remove();
        return;
      }
      seenImages.add(imageId);

      const width = parseInt($el.attr('width') || '0', 10);
      const height = parseInt($el.attr('height') || '0', 10);

      if ((width > 0 && width < 200) || (height > 0 && height < 150)) {
        $el.remove();
        return;
      }

      if (srcLower.includes('160x90') || srcLower.includes('100x100') || srcLower.includes('thumbnail')) {
        $el.remove();
        return;
      }
    });

    contentNode.find('a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('#')) {
        try {
          const absoluteUrl = new URL(href, url).href;
          $el.attr('href', absoluteUrl);
        } catch (e) {
          // Keep original
        }
      }
    });

    // Remove empty elements (iterative approach)
    contentNode.find('p, div, span, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
      if ($(el).text().trim().length === 0 && $(el).children().length === 0) {
        $(el).remove();
      }
    });

    const content = contentNode.html() || '';
    const textContent = contentNode.text().trim().replace(/\s+/g, ' ');

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
    console.error('Error processing URL:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
