
/* Synthetic regression only — no real employment data. */
const r2=x=>Math.round((x+Number.EPSILON)*100)/100;
function voluntaryLegalComp(){ return 0; }
function notice(monthly,required,given){
  const missing=Math.max(0,required-given);
  return r2(monthly/30*missing);
}
function justCause(monthly,years,daysPerYear){
  return r2(Math.max(monthly*3,(monthly/30)*daysPerYear*years));
}
if(voluntaryLegalComp()!==0) throw new Error("Voluntary resignation must not auto-award legal compensation");
if(notice(2700,60,45)!==1350) throw new Error("Notice shortfall regression failed");
if(justCause(2700,1.2,30)!==8100) throw new Error("3-month just-cause minimum regression failed");
if(justCause(2700,5,30)!==13500) throw new Error("Just-cause service calculation regression failed");
console.log("Synthetic worker termination regression OK");
