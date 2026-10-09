/* Valores sintéticos de exemplos oficiais da AT (FAQ 2026). */
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','app.js'),'utf8');
const head=source.slice(0,source.indexOf('function formatDatePT'));
const context={document:{querySelectorAll:()=>[]},Intl,Math,Number,Date};
vm.createContext(context);vm.runInContext(head,context);
const irs=(amount,status,deps)=>vm.runInContext(`irs(${amount},${JSON.stringify(status)},${deps})`,context);
assert.equal(irs(960,'single0',0),18);
assert.equal(irs(960,'singleDeps',1),0);
assert.equal(irs(2000,'married2',0),301.34); // AT FAQ publica retenção arredondada ao euro: 301€
assert.equal(irs(1150,'married2',2),42.98);
assert.equal(irs(2500,'married1',0),279.78);
for(const status of ['single0','singleDeps','married2','married1']){
 for(const amount of [0,500,920,921,991,1042,1043,1108,1109,1154,1155,1212,1213,1819,1820,2119,2120,2499,2500,3305,3306,5547,5548,20221,20222,50000]){
  const value=irs(amount,status,2);assert(Number.isFinite(value)&&value>=0,`${status} ${amount}`);
 }
}
console.log('Official AT 2026 example checks and bracket smoke tests OK');
