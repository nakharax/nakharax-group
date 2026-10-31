import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('AI Workforce mission opens the public knowledge collection, not internal Office',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const block=app.match(/  hermes: \{([\s\S]*?)\n  \},/)[1];
 assert.ok(block.includes('link: "https://knowledge.nakharax.com/"'));
 assert.ok(block.includes('not live telemetry'));
});
test('Planet III hero link works even without JavaScript',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<a href="https:\/\/knowledge\.nakharax\.com\/"[^>]*data-quick-mission="hermes"/);
});
