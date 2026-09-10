
/* Synthetic tax grouping regression — no real employment data. */
const round2=x=>Math.round((x+Number.EPSILON)*100)/100;

// deliberately simplified mock progressive withholding to assert grouping behavior
function mockIrs(x){
  if(x<=1000) return round2(x*.10);
  return round2(x*.20-100);
}
function proportionalAutonomous(entitlement,due){
  return round2(mockIrs(entitlement)*(due/entitlement));
}

const salary=1800, vacation=600, training=300, taxableComp=500;
const groupedBase=salary+vacation+training+taxableComp;
const grouped=mockIrs(groupedBase);
const isolated=mockIrs(salary)+mockIrs(vacation)+mockIrs(training)+mockIrs(taxableComp);

if(grouped===isolated) throw new Error("Grouping regression ineffective");
if(grouped!==540) throw new Error(`Expected grouped IRS 540, got ${grouped}`);

const holidayEntitlement=2400, holidayDue=600;
const autonomous=proportionalAutonomous(holidayEntitlement,holidayDue);
if(autonomous!==95) throw new Error(`Expected proportional autonomous IRS 95, got ${autonomous}`);

console.log("Synthetic tax grouping regression OK", {grouped, isolated, autonomous});
