const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { chromium } = require('playwright-core');

const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const code = source.slice(source.indexOf('function bindSynchronizedTableScroll('), source.indexOf('function refreshFloatingTableHeader('));
const context = vm.createContext({});
vm.runInContext(code, context);

// Deterministic delayed/coalesced events and differing scrollbar ranges.
const queue = [];
function scroller(max) {
    let left = 0;
    const listeners = new Set();
    return {
        get scrollLeft() { return left; },
        set scrollLeft(value) {
            const next = Math.max(0, Math.min(max, value));
            if (next === left) return;
            left = next;
            queue.push(() => listeners.forEach(fn => fn()));
        },
        addEventListener(_, fn) { listeners.add(fn); },
        removeEventListener(_, fn) { listeners.delete(fn); }
    };
}
const rails = [scroller(1000), scroller(998), scroller(1000)];
let updates = 0;
const dispose = context.bindSynchronizedTableScroll(rails, () => updates++);
const drain = () => {
    let count = 0;
    while (queue.length) {
        assert.ok(++count < 100, 'Scroll feedback loop');
        queue.shift()();
    }
};
rails[0].scrollLeft = 1000;
drain();
assert.deepEqual(rails.map(r => r.scrollLeft), [1000, 998, 1000]);
assert.equal(updates, 1);
rails[0].scrollLeft = 400;
queue.shift()();
rails[0].scrollLeft = 600;
drain();
assert.deepEqual(rails.map(r => r.scrollLeft), [600, 600, 600]);
for (const rail of rails) {
    rail.scrollLeft = 125.5;
    drain();
    assert.ok(rails.every(r => r.scrollLeft === 125.5));
    rail.scrollLeft = 750;
    drain();
}
dispose();
rails[0].scrollLeft = 10;
drain();
assert.equal(rails[1].scrollLeft, 750);

(async () => {
    const executablePath = process.env.SMOKE_BROWSER || [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    ].find(p => fs.existsSync(p));
    assert.ok(executablePath, 'Set SMOKE_BROWSER to Chrome or Edge');
    const browser = await chromium.launch({ executablePath, headless: true });
    try {
        for (const width of [1280, 1920]) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            await page.setContent(`<style>.rail{width:80%;overflow-x:scroll;height:30px}.rail>div{width:3200px;height:1px}</style>${'<div class="rail"><div></div></div>'.repeat(3)}`);
            await page.addScriptTag({ content: code });
            await page.evaluate(() => {
                window.updates = 0;
                bindSynchronizedTableScroll([...document.querySelectorAll('.rail')], () => window.updates++);
            });
            for (let driver = 0; driver < 3; driver++) {
                await page.evaluate(async driver => {
                    const rails = [...document.querySelectorAll('.rail')];
                    for (const left of [0, 200, 450, 800, 1200, 2000, 3200, 1700, 700, 0]) {
                        rails[driver].scrollLeft = left;
                        await new Promise(requestAnimationFrame);
                    }
                }, driver);
                await page.waitForTimeout(150);
                const before = await page.evaluate(() => ({ positions: [...document.querySelectorAll('.rail')].map(r => r.scrollLeft), updates }));
                assert.deepEqual(before.positions, [0, 0, 0]);
                await page.waitForTimeout(150);
                assert.equal(await page.evaluate(() => updates), before.updates, 'Events must settle after dragging stops');
            }
            await page.close();
        }
    } finally { await browser.close(); }
    console.log('Table scroll checks passed: delayed events, clamping, rapid movement, cleanup, Chrome laptop/desktop viewports.');
})().catch(error => { console.error(error); process.exitCode = 1; });
