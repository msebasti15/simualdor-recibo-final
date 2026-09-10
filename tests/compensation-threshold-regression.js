
/* Synthetic regression: legal + extra are one fiscal compensation bucket. */
const r2=x=>Math.round((x+Number.EPSILON)*100)/100;
function split(legal,extra,limit){
  const total=r2(legal+extra);
  const taxable=r2(Math.max(0,total-limit));
  const legalVisual=total>0?r2(taxable*legal/total):0;
  const extraVisual=r2(taxable-legalVisual);
  return {total,taxable,legalVisual,extraVisual};
}
let a=split(2400,600,3500);
if(a.taxable!==0 || a.legalVisual!==0 || a.extraVisual!==0)
  throw new Error("Below-limit combined compensation must be fully non-taxable");

let b=split(2400,1600,3500);
if(b.taxable!==500) throw new Error(`Expected 500 taxable excess, got ${b.taxable}`);
if(r2(b.legalVisual+b.extraVisual)!==500)
  throw new Error("Visual split must sum exactly to combined taxable excess");

console.log("Synthetic combined compensation threshold regression OK", {a,b});
