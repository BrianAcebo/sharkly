import type { Request, Response } from 'express';
import fetch, { AbortError } from 'node-fetch';

import { config } from '../config.js';

const GOOGLE_CSE_API_KEY = config.googleSearch.apiKey;
const GOOGLE_CSE_CX = config.googleSearch.cx;
const SEARCH_ENDPOINT = 'https://customsearch.googleapis.com/customsearch/v1';

type GoogleProgrammableSearchResponse = {
  items?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    htmlSnippet?: string;
    displayLink?: string;
    formattedUrl?: string;
    cacheId?: string;
    pagemap?: {
      cse_thumbnail?: Array<{ src?: string }>;
      cse_image?: Array<{ src?: string }>;
      metatags?: Array<Record<string, string | undefined>>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  searchInformation?: {
    totalResults?: string;
    searchTime?: number;
    formattedTotalResults?: string;
    formattedSearchTime?: string;
  };
  queries?: {
    nextPage?: Array<{ startIndex?: number }>;
    previousPage?: Array<{ startIndex?: number }>;
  };
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

const abortableFetch = async (url: string, timeoutMs = 10_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const searchGoogleProgrammable = async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      return res.status(400).json({ error: { message: 'Query parameter "q" is required.' } });
    }

    if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) {
      console.error('Google Programmable Search is not configured. Missing API key or CX identifier.');
      return res.status(503).json({ error: { message: 'Search service is temporarily unavailable.' } });
    }

    const perPageRaw = Array.isArray(req.query.num) ? req.query.num[0] : req.query.num;
    const pageRaw = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
    const safeRaw = Array.isArray(req.query.safe) ? req.query.safe[0] : req.query.safe;
    const siteSearchRaw = Array.isArray(req.query.siteSearch) ? req.query.siteSearch[0] : req.query.siteSearch;
    const languageRestrictionRaw = Array.isArray(req.query.languageRestriction)
      ? req.query.languageRestriction[0]
      : req.query.languageRestriction;

    const perPage = Math.min(Math.max(Number(perPageRaw) || 10, 1), 10);
    const page = Math.max(Number(pageRaw) || 1, 1);
    const startIndex = (page - 1) * perPage + 1;

    const params = new URLSearchParams({
      key: GOOGLE_CSE_API_KEY,
      cx: GOOGLE_CSE_CX,
      q: query,
      num: String(perPage),
      start: String(startIndex)
    });

    if (safeRaw === 'active') {
      params.set('safe', 'active');
    }

    if (siteSearchRaw) {
      params.set('siteSearch', siteSearchRaw);
    }

    if (languageRestrictionRaw) {
      params.set('lr', languageRestrictionRaw);
    }

    const url = `${SEARCH_ENDPOINT}?${params.toString()}`;
    const response = await abortableFetch(url);

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      console.error(`Google Programmable Search error (${status}): ${text}`);
      return res.status(status === 403 ? 429 : status).json({
        error: { message: 'Failed to fetch search results from Google.' }
      });
    }

    const data = (await response.json()) as GoogleProgrammableSearchResponse;

    if (data.error) {
      console.error('Google Programmable Search API error:', data.error);
      return res.status(data.error.code ?? 502).json({ error: { message: data.error.message ?? 'Search failed.' } });
    }

    const totalResults = Number(data.searchInformation?.totalResults ?? 0);
    const searchTime = data.searchInformation?.searchTime ?? 0;

    const items = (data.items ?? []).map((item) => {
      const thumbnail = item.pagemap?.cse_thumbnail?.[0]?.src ?? null;
      const heroImage = item.pagemap?.cse_image?.[0]?.src ?? null;
      const meta = item.pagemap?.metatags?.[0] ?? {};

      return {
        title: item.title ?? null,
        link: item.link ?? null,
        snippet: item.snippet ?? null,
        htmlSnippet: item.htmlSnippet ?? null,
        displayLink: item.displayLink ?? null,
        formattedUrl: item.formattedUrl ?? null,
        cacheId: item.cacheId ?? null,
        thumbnail,
        image: heroImage,
        favicon: (meta['og:image'] || meta['twitter:image'] || meta['msapplication-TileImage'] || null) ?? null,
        meta
      };
    });

    const nextStartIndex = data.queries?.nextPage?.[0]?.startIndex;
    const prevStartIndex = data.queries?.previousPage?.[0]?.startIndex;

    return res.json({
      query,
      page,
      perPage,
      totalResults,
      searchTime,
      items,
      nextPage: nextStartIndex ? Math.ceil(((nextStartIndex ?? 1) - 1) / perPage + 1) : null,
      previousPage: prevStartIndex ? Math.ceil(((prevStartIndex ?? 1) - 1) / perPage + 1) : null
    });
  } catch (error) {
    if (error instanceof AbortError) {
      console.error('Google Programmable Search request timed out.');
      return res.status(504).json({ error: { message: 'Search request timed out. Please try again.' } });
    }

    console.error('Unexpected Google Programmable Search error:', error);
    return res.status(500).json({ error: { message: 'Unexpected error while performing search.' } });
  }
};


