/* Synthetic history regression. */
const assert=require('node:assert/strict');
function historyMonths(end){return Array.from({length:12},(_,i)=>{const d=new Date(end.getFullYear(),end.getMonth()-12+i,1,12);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});}
const keys=historyMonths(new Date(2026,9,15,12));
assert.equal(keys.length,12);assert.equal(keys[0],'2025-10');assert.equal(keys[11],'2026-09');
const values=keys.map((_,i)=>i<3?2700:3000);
assert.equal(Math.round(values.reduce((a,b)=>a+b,0)/12*100)/100,2925);
assert.equal(new Set(keys).size,12);
console.log('Synthetic salary history regression OK');
