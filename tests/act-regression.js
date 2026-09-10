/*
 * SYNTHETIC REGRESSION FIXTURE
 * No value below comes from a real employment case.
 */
const round2=x=>Math.round((x+Number.EPSILON)*100)/100;

const f={
  base:3200,
  compYears:2,
  compMonths:2,
  compDays:4,
  vacationMonths:16,
  vacationDays:3,
  taken:6,
  holidayPaid:2800,
  christmasMonths:7
};

const compensation=round2(
  (f.base/30)*14*(f.compYears+f.compMonths/12+f.compDays/360)
);
const vacationRight=round2(
  f.base*(f.vacationMonths/12+f.vacationDays/365)
);
const vacationDue=round2(vacationRight-f.taken*(f.base/22));
const holidayDue=round2(vacationRight-f.holidayPaid);
const christmas=round2(f.base*f.christmasMonths/12);
const total=round2(compensation+vacationDue+holidayDue+christmas);

const actual={compensation,vacationDue,holidayDue,christmas,total};

// Expected values are fixed for this synthetic fixture.
const expected={
  compensation:3252.15,
  vacationDue:3420.24,
  holidayDue:1492.97,
  christmas:1866.67,
  total:10032.03
};

for(const k of Object.keys(expected)){
  if(actual[k]!==expected[k]){
    console.error(`${k}: expected ${expected[k]}, got ${actual[k]}`);
    process.exit(1);
  }
}
console.log("Synthetic regression OK",actual);
