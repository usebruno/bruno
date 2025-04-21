import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

const renderStaticHtml = async (html: string, query: string) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  await page.goto(dataUrl + query, { waitUntil: 'load' });
  await page.waitForTimeout(10000);
  let finalHtml = await page.content();
  finalHtml = finalHtml?.replace?.(query, '');
  await browser.close();
  return finalHtml;
}

const getHtmlText = (html: string) => {
  const $ = cheerio.load(html);
  $('script, style, noscript, meta, link').remove();
  $('[style*="display:none"], [style*="display: none"]').remove();
  $('[style*="visibility:hidden"], [style*="visibility: hidden"]').remove();
  $('[hidden], [aria-hidden="true"]').remove();
  $('.n-page-header-wrapper').remove();
  $('.n-tabs-nav--segment-type').remove();
  $('.n-switch').remove();
  return $('body').text()?.replace(/\s/g, '')
}

export { renderStaticHtml, getHtmlText }