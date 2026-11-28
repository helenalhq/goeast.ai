import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const url = (process.env.ARRIVAL_TEST_BASE ?? 'http://127.0.0.1:3181') + '/shanghai-arrival-check';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/tmp/chromium',args:['--no-sandbox']});
try {
  for (const width of [360, 390, 768, 1366]) {
    const page = await browser.newPage({ viewport:{width,height:844}, acceptDownloads:true, isMobile:width<500, hasTouch:width<500 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(url);
    assert.equal(response.status(),200);
    const legacy = page.getByRole('link',{name:'See a sample',exact:true});
    if (await legacy.count()) {
      const before = await page.evaluate(()=>scrollY);
      await legacy.click();
      console.log('BASELINE: sample only changed anchor', {width,hash:new URL(page.url()).hash,scrollDelta:await page.evaluate(()=>scrollY)-before,dialogCount:await page.getByRole('dialog').count()});
    }
    const trigger = page.getByRole('button',{name:'See a sample',exact:true});
    assert.equal(await trigger.count(),1,'Expected a sample control that opens a distinct preview');
    await trigger.click();
    const dialog = page.getByRole('dialog',{name:'Your first hour in Shanghai'});
    await dialog.waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),true);
    assert.equal(await dialog.getByRole('button',{name:'Close sample'}).evaluate(el=>el===document.activeElement),true);
    await dialog.getByRole('heading',{name:'The airport-to-hotel plan'}).waitFor();
    await dialog.getByRole('img',{name:/address card/}).evaluate(async image => { await image.decode(); assertImage(image); function assertImage(el) { if(!el.naturalWidth) throw new Error('Missing card'); }});
    for (const [name,ext] of [['Download sample PDF','pdf'],['Download address card','png']]) {
      const [dl] = await Promise.all([page.waitForEvent('download'),dialog.getByRole('link',{name,exact:true}).click()]);
      assert.ok(dl.suggestedFilename().endsWith('.'+ext)); assert.equal(await dl.failure(),null);
    }
    if (process.env.ARRIVAL_CONTROL_SCREENSHOT && width === 390) await page.screenshot({path:process.env.ARRIVAL_CONTROL_SCREENSHOT+'-sample.png'});
    const daytime = dialog.getByRole('button',{name:/Daytime/});
    await daytime.click();
    assert.equal(await daytime.getAttribute('aria-pressed'),'true');
    await dialog.getByText('Take Metro Line 2 to Lujiazui if it is running normally.',{exact:true}).waitFor();
    await dialog.getByText(/official T1 taxi stand outside Arrival Gate 12/).waitFor();
    await dialog.getByText('What we checked',{exact:true}).click();
    await dialog.getByRole('link',{name:/Shanghai Metro \/ Metro ticketing/}).waitFor();
    const [dayPDF] = await Promise.all([page.waitForEvent('download'),dialog.getByRole('link',{name:'Download sample PDF',exact:true}).click()]);
    assert.equal(dayPDF.suggestedFilename(),'shanghai-arrival-daytime.pdf');
    assert.equal(await dayPDF.failure(),null);
    await dialog.getByRole('button',{name:/Late night/}).click();
    await dialog.getByText('Take an official taxi from Arrival Gate 25.',{exact:true}).waitFor();
    await dialog.getByText(/later|published regular last departure/, {exact:false}).first().waitFor();
    assert.match(await dialog.getByRole('link',{name:'Download sample PDF'}).getAttribute('href'),/shanghai-arrival-check\.pdf/);
    await dialog.getByRole('button',{name:'Close sample'}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Enter');
    await dialog.waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    if (process.env.ARRIVAL_CONTROL_SCREENSHOT && [390,1366].includes(width)) {
      await page.getByRole('heading',{level:1}).click();
      await page.screenshot({path:process.env.ARRIVAL_CONTROL_SCREENSHOT+`-${width}.png`,style:'nextjs-portal { display: none !important; }'});
    }
    await page.getByRole('link',{name:'Try a sample trip',exact:true}).click();
    const intake = page.getByRole('region',{name:'Check my trip'});
    await intake.getByRole('button',{name:'Use the late-arrival example'}).click();
    assert.equal(await intake.getByLabel('Flight number').inputValue(),'DX246');
    const optional = intake.getByText('Optional: add a backup preference',{exact:true});
    await optional.click();
    await intake.getByLabel('I may not have mobile data').check();
    await intake.getByLabel('I may not have mobile payments set up').check();
    await intake.getByLabel('I already have an airport pickup').check();
    await intake.getByRole('link',{name:'free guide',exact:true}).waitFor();
    await optional.click();
    await intake.getByRole('button',{name:'Review my trip'}).click();
    await page.waitForFunction(()=>document.activeElement?.id==='arrival-review-heading');
    await intake.getByText('I may not have mobile data', {exact:false}).filter({visible:true}).waitFor();
    await intake.getByRole('button',{name:'Use sample email'}).click();
    const confirm = intake.getByRole('button',{name:'Preview order confirmation'});
    await confirm.waitFor();
    await page.waitForFunction(()=>document.activeElement?.id==='arrival-demo-confirm');
    await confirm.click();
    await intake.getByText(/no money was taken/).waitFor();
    await intake.getByRole('button',{name:'Try another trip'}).click();
    for (const [question, answer] of [
      ['Does this book a ride?',/It doesn’t book transport/],
      ['How quickly would I get it?',/Pilot target: two hours/],
      ['Already arranged airport pickup?',/may be all you need/],
    ]) {
      const summary = page.getByText(question,{exact:true});
      await summary.click(); const body = page.getByText(answer); await body.waitFor();
      await summary.click(); await body.waitFor({state:'hidden'});
    }
    const navigation = page.getByRole('navigation',{name:'GoEast arrival navigation'});
    await navigation.getByRole('link',{name:'Free China travel guide'}).click();
    await page.waitForURL('**/china-travel-guide');
    assert.equal(new URL(page.url()).pathname,'/china-travel-guide');
    await page.goto(url);
    await navigation.locator('a[href="/"]').click();
    await page.waitForURL(new URL('/',url).href);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(`PASS ${width}px: sample modal, keyboard/Escape/focus, files, form, preferences, FAQ and navigation`);
  }
} finally { await browser.close(); }
