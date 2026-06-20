import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5175', {waitUntil: 'networkidle0'}).catch(e => console.log(e));
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const tab = btns.find(b => b.textContent.includes('因果ループ図'));
    if (tab) tab.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('HTML SNIPPET:', html.substring(0, 500)); // just to see if it crashed
  // search for "検出されたループ"
  console.log('HAS LOOPS:', html.includes('検出されたループ'));
  
  await browser.close();
})();
