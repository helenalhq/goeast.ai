import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}, acceptDownloads:true});
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => { if (['POST','PUT','PATCH','DELETE'].includes(req.method())) writes.push(req.url()); });
    const url = (process.env.ARRIVAL_TEST_BASE ?? 'http://127.0.0.1:3177') + '/shanghai-arrival-check';
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
    assert.equal(await page.getByRole('navigation',{name:'GoEast arrival navigation'}).isVisible(),true);
    assert.equal(await page.locator('body > button[aria-label="Feedback"]').isVisible(),false);
    await page.getByRole('link',{name:'Try a sample trip'}).click();
    const section = page.getByRole('region',{name:'Check my trip'});
    const button = name => section.getByRole('button',{name,exact:true});
    const load = key => section.getByLabel('Load a fictional itinerary').selectOption(key);
    const check = () => button('Review my trip').click();
    const visible = async (pattern) => section.getByText(pattern).filter({visible:true}).first().waitFor();
    const noQuote = async () => assert.equal(await button('Preview order confirmation').count(),0);
    const noScroll = async () => assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),true);

    await load('late'); await check(); await visible(/Pudong \(PVG\) T2/); await button('Use sample email').click();
    await visible(/Demo quote · US\$12\.90/);
    await noScroll();
    if(process.env.ARRIVAL_SCREENSHOT) await page.screenshot({path:process.env.ARRIVAL_SCREENSHOT,fullPage:true});
    await button('Edit trip').click();
    assert.equal(await section.getByLabel('Flight number').inputValue(),'DX246');
    await load('day'); await check(); await visible(/Pudong \(PVG\) T1/); await button('Use sample email').click(); await button('Preview order confirmation').click();
    await visible(/No order was created, no money was taken and no email was sent/); await button('Try another trip').click();

    await load('codeshare'); await check(); await visible(/outside the airport lookup window/); await noQuote();
    await section.getByLabel(/Operated by/).fill('Demo Pacific');
    await check(); await visible(/Which hotel address is yours/); await noQuote();
    await section.getByRole('radio',{name:/Bund Garden North/}).check();
    await check(); await visible(/Sat, Dec 5, 00:35/); await visible(/Scheduled · operating flight DP804/); await visible(/50 Sample Lane/);
    await button('Edit trip').click();
    assert.equal(await section.getByLabel('Arrival date in Shanghai').inputValue(),'2026-12-05');
    assert.equal(await section.getByLabel(/Operated by/).inputValue(),'Demo Pacific');
    await section.getByLabel('Arrival date in Shanghai').fill('2026-12-06'); await check();
    await visible(/flight number is not necessarily wrong/); await noQuote();

    await load('otherAirport'); await check(); await visible(/Hongqiao/); await noQuote();
    await load('uncertain'); await check(); await visible(/couldn't verify this flight's terminal/); await noQuote();
    await load('unavailable'); await check(); await visible(/temporarily unavailable/); await noQuote(); await noScroll();
    await load('day'); await section.getByLabel('Flight number').fill('XX99'); await check(); await visible(/No flight matched/); await noQuote();
    await load('day'); await section.getByLabel('Hotel name').fill('Unlisted property'); await check(); await visible(/No sample property matched/); await noQuote();

    await page.setViewportSize({width:1366,height:900}); await noScroll();
    await page.getByRole('button',{name:'See a sample',exact:true}).click();
    for(const [name,ext] of [['Download sample PDF','pdf'],['Download address card','png']]){
      const [dl] = await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name,exact:true}).click()]);
      assert.ok(dl.suggestedFilename().endsWith('.'+ext)); assert.equal(await dl.failure(),null);
    }
    assert.deepEqual(errors,[]); assert.deepEqual(writes,[]);
    console.log('PASS: mobile/desktop, T1/T2, progress/edit, Shanghai date, codeshare, same-name hotel, outside-window, source failure, SHA, unmatched number and hotel, no submission, noindex, PDF/PNG');
  } finally { await browser.close(); }
})().catch(e=>{ console.error(e); process.exitCode=1; });
