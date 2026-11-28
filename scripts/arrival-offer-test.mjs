import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const url = (process.env.ARRIVAL_TEST_BASE ?? 'http://127.0.0.1:3183') + '/shanghai-arrival-check';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/tmp/chromium',args:['--no-sandbox']});
try {
  for (const width of [360, 390, 768, 1366]) {
    const page = await browser.newPage({viewport:{width,height:740},isMobile:width<500,hasTouch:width<500});
    const writes = [];
    page.on('request', r=>{ if (['POST','PUT','PATCH','DELETE'].includes(r.method())) writes.push(r.url()); });
    const response = await page.goto(url);
    assert.equal(response.status(),200);
    const hero = page.getByRole('heading',{name:'Your plan from Pudong Airport to your hotel.'});
    await hero.waitFor({timeout:3000});
    const primary = page.getByRole('link',{name:'Try a sample trip',exact:true});
    assert.ok((await primary.boundingBox()).y+(await primary.boundingBox()).height<740);
    await page.getByText('US$12.90',{exact:true}).waitFor();
    await page.getByText(/For first-time visitors with a Pudong flight and Shanghai hotel booked/).waitFor();
    const proof = page.getByRole('complementary',{name:'Same hotel. Two different routes.'});
    const dialogue = page.getByRole('dialog',{name:'Your first hour in Shanghai'});
    for (const row of [
      ['Open late-night arrival sample','shanghai-arrival-check.pdf',/Arrival Gate 25/],
      ['Open daytime arrival sample','shanghai-arrival-daytime.pdf',/Metro Line 2 to Lujiazui/],
    ]) {
      const btn = proof.getByRole('button',{name:row[0]});
      await btn.click();
      await dialogue.locator('h3').waitFor();
      await dialogue.getByText(row[2]).first().waitFor();
      assert.ok((await dialogue.getByRole('link',{name:'Download sample PDF'}).getAttribute('href')).endsWith(row[1]));
      await dialogue.getByText('Offline and payment backups',{exact:true}).click();
      await dialogue.getByText(row[1].includes('daytime') ? /Park Hyatt Shanghai is a different property/ : /The airport lists a late-night bus/).waitFor();
      if (!row[1].includes('daytime')) await dialogue.getByText(/请问守航夜宵线在哪里上车/).waitFor();
      await dialogue.getByRole('button',{name:'Close sample'}).click();
      await dialogue.waitFor({state:'hidden'});
      await page.waitForFunction(name=>document.activeElement?.getAttribute('aria-label')?.startsWith(name),row[0]);
    }
    const value = page.getByRole('region',{name:'Why pay for the check?'});
    await value.getByText(/The free guide explains the options/).waitFor();
    assert.equal(await value.getByRole('link',{name:'Read the free guide'}).getAttribute('href'),'/china-travel-guide');
    const cta = page.getByRole('heading',{name:'See how your details change the plan'});
    await cta.waitFor();
    await primary.click();
    const intake = page.getByRole('region',{name:'Check my trip'});
    await intake.getByRole('button',{name:'Use the late-arrival example'}).click();
    await intake.getByRole('button',{name:'Review my trip'}).click();
    await intake.getByRole('button',{name:'Use sample email'}).click();
    await intake.getByText('Included: route and backup plan, offline PDF and Chinese address card.',{exact:true}).waitFor();
    await intake.getByRole('button',{name:'Preview order confirmation'}).click();
    await intake.getByText(/no money was taken/).waitFor();
    assert.deepEqual(writes,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    if (process.env.ARRIVAL_OFFER_SCREENSHOT && [390,1366].includes(width)) {
      await page.goto(url);
      await page.screenshot({path:process.env.ARRIVAL_OFFER_SCREENSHOT+`-${width}.png`,style:'nextjs-portal { display:none !important; }'});
    }
    console.log(`PASS ${width}px: above-fold offer, correct case/asset, keyboard focus restoration, free alternative, no-payment path.`);
    await page.close();
  }
} finally { await browser.close(); }
