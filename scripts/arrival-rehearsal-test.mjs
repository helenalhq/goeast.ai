import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, acceptDownloads: true});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto((process.env.ARRIVAL_TEST_BASE ?? 'http://127.0.0.1:3177') + '/shanghai-arrival-check');
    assert.equal(response.status(), 200);
    assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    const click = text => page.getByRole('button', {name: text, exact: true}).click();
    await page.getByText('Operator demo: simulated fulfillment',{exact:true}).click();
    const begin = async scenario => {
      await page.locator('#scenario').selectOption(scenario);
      for(const step of ['Submit test request','Simulate matching paid invoice','Prepare draft']) await click(step);
    };
    const draft = page.locator('#rehearsal article');
    await begin('t1'); assert.match(await draft.innerText(), /Gate 12/);
    await click('Approve draft'); await click('Simulate itinerary update');
    assert.equal(await page.getByRole('button',{name:'Simulate sending'}).count(), 0);
    await click('Reset sample');
    await begin('day'); assert.doesNotMatch(await draft.innerText(), /midnight|22:15/);
    await begin('unknown'); assert.match(await page.locator('[aria-live=polite]').filter({hasText:'On hold'}).innerText(), /On hold/);
    assert.equal(await draft.count(), 0);
    await begin('ambiguous'); assert.equal(await draft.count(), 0);
    await begin('t2'); assert.match(await draft.innerText(), /Gate 25/);
    await click('Approve draft'); await click('Simulate sending');
    assert.match(await page.getByText('Simulated delivery recorded', {exact:false}).innerText(), /no email was sent/);
    await page.getByRole('button',{name:'See a sample',exact:true}).click();
    for(const [name,ext] of [['Download sample PDF','pdf'],['Download address card','png']]){
      const [dl] = await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name,exact:true}).click()]);
      assert.ok(dl.suggestedFilename().endsWith('.'+ext));
      assert.equal(await dl.failure(),null);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: 390px viewport, noindex, T1/T2/day, two holds, stale approval, simulated delivery, PDF+PNG downloads');
    if(process.env.ARRIVAL_SCREENSHOT) {
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:process.env.ARRIVAL_SCREENSHOT,fullPage:true});
    }
  } finally { await browser.close(); }
})().catch(e=>{ console.error(e); process.exitCode=1; });
