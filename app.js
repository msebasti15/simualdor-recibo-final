const eurFmt = new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'});
const els = Object.fromEntries([...document.querySelectorAll('[id]')].map(x=>[x.id,x]));
const num=id=>Number(els[id].value||0);
const dayMs=86400000;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const round2=x=>Math.round((x+Number.EPSILON)*100)/100;
const date=s=>new Date(`${s}T12:00:00`);
const daysBetween=(a,b)=>Math.max(0,(b-a)/dayMs);
const overlapDays=(start,end,segStart,segEnd)=>{
  const a=Math.max(start.getTime(),segStart.getTime());
  const b=Math.min(end.getTime(),segEnd.getTime());
  return Math.max(0,(b-a)/dayMs);
};
const yearsExact=(a,b)=>daysBetween(a,b)/365.2425;

// 2026 Continente — Despacho 233-A/2026. Only tables I–III (no disability).
const commonRows=[
 [920,.0000,()=>0],[1042,.1250,R=>.125*2.60*(1273.85-R)],[1108,.1570,R=>.157*1.35*(1554.83-R)],
 [1154,.1570,()=>94.71],[1212,.2120,()=>158.18],[1819,.2410,()=>193.33],[2119,.3110,()=>320.66],
 [2499,.3490,()=>401.19],[3305,.3836,()=>487.66],[5547,.3969,()=>531.62],[20221,.4495,()=>823.40],[Infinity,.4717,()=>1272.31]
];
const married1Rows=[
 [991,.0000,()=>0],[1042,.1250,R=>.125*2.6*(1372.15-R)],[1108,.1250,R=>.125*1.35*(1677.85-R)],
 [1119,.1250,()=>96.17],[1432,.1272,()=>98.64],[1962,.1570,()=>141.32],[2240,.1938,()=>213.53],
 [2773,.2277,()=>289.47],[3389,.2570,()=>370.72],[5965,.2881,()=>476.12],[20265,.3843,()=>1049.96],[Infinity,.4717,()=>2821.13]
];
function irs(amount,status,deps){
  if(amount<=0) return 0;
  const isMarried1=status==='married1';
  const rows=isMarried1?married1Rows:commonRows;
  let [limit,rate,deductFn]=rows.find(r=>amount<=r[0]);
  let deduction=deductFn(amount);
  let depDed=0;
  if(isMarried1) depDed=42.86*deps;
  else if(status==='singleDeps') depDed=34.29*deps;
  else if(status==='married2') depDed=21.43*deps;
  // 3+ dependents: 1 pp reduction for tables I and II (not table III)
  if(deps>=3 && !isMarried1) rate=Math.max(0,rate-.01);
  return Math.max(0,round2(amount*rate-deduction-depDed));
}


function formatDatePT(d){
  return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}

function civilYearOverlap(start,end,year){
  const ys=new Date(year,0,1,12), ye=new Date(year+1,0,1,12);
  const a=new Date(Math.max(start.getTime(),ys.getTime()));
  const endExclusive=new Date(end.getTime()+dayMs);
  const b=new Date(Math.min(endExclusive.getTime(),ye.getTime()));
  if(b<=a) return null;
  return {start:a,end:new Date(b.getTime()-dayMs),days:(b-a)/dayMs,yearDays:(ye-ys)/dayMs};
}

const trainingState={};
function trainingYearsForContract(){
  if(!els.startDate.value||!els.endDate.value) return [];
  const start=date(els.startDate.value), end=date(els.endDate.value);
  if(end<start) return [];
  const years=[];
  for(let y=start.getFullYear();y<=end.getFullYear();y++){
    const overlap=civilYearOverlap(start,end,y);
    if(overlap) years.push({year:y,...overlap});
  }
  return years.slice(-5);
}
function annualTrainingHours(year){
  // 35 h até 2019; 40 h desde 2020 (Lei n.º 93/2019).
  return year >= 2020 ? 40 : 35;
}
function estimatedTrainingEntitlement(row){
  const annual=annualTrainingHours(row.year);
  const type=els.contractType?.value || 'indefinite';
  if(type==='indefinite'){
    // Modo ACT: nos contratos sem termo, o simulador ACT considera o mínimo anual
    // por cada ano civil apresentado, mesmo quando o ano de cessação é parcial.
    return annual;
  }
  // Art. 131.º/2: contratos a termo >= 3 meses têm mínimo proporcional à duração nesse ano.
  const contractStart=date(els.startDate.value), contractEnd=date(els.endDate.value);
  const totalDays=daysBetween(contractStart,new Date(contractEnd.getTime()+dayMs));
  if(totalDays < 365.2425/4) return 0; // aproximação de 3 meses; abaixo disso não há mínimo legal.
  return round2(annual*(row.days/row.yearDays));
}
function trainingDebtRows(){
  return trainingYearsForContract().map(row=>{
    const entitlement=estimatedTrainingEntitlement(row);
    const completed=Math.max(0,Number(trainingState[row.year]||0));
    return {...row,entitlement,completed,debt:round2(Math.max(0,entitlement-completed))};
  });
}
function totalTrainingDebt(){
  const rows=trainingDebtRows();
  // A formação pode ser antecipada/diferida e é imputada à obrigação mais antiga.
  // Para o total, interessa o conjunto da janela legal e não limitar artificialmente
  // a formação ao próprio ano em que foi ministrada.
  return round2(Math.max(0,rows.reduce((a,r)=>a+r.entitlement,0)-rows.reduce((a,r)=>a+r.completed,0)));
}
function renderTrainingYears(){
  const rows=trainingDebtRows();
  els.trainingYears.innerHTML=rows.map(row=>`<tr>
    <td><strong>${row.year}</strong></td>
    <td>${formatDatePT(row.start)} – ${formatDatePT(row.end)}</td>
    <td>${row.entitlement.toFixed(2)} h</td>
    <td><input class="training-completed" data-year="${row.year}" type="number" min="0" step="0.5" value="${row.completed}"></td>
    <td><strong>${row.debt.toFixed(2)} h</strong></td>
  </tr>`).join('');
  document.querySelectorAll('.training-completed').forEach(input=>input.addEventListener('input',()=>{
    trainingState[input.dataset.year]=Number(input.value||0);
    recalc(false,false);
  }));
  els.trainingHoursTotal.textContent=`${totalTrainingDebt().toFixed(2)} h`;
}
function isShortVacationCase(start,end){
  const startYear=start.getFullYear(), endYear=end.getFullYear();
  const oneYearLater=new Date(start); oneYearLater.setFullYear(start.getFullYear()+1);
  return endYear===startYear || endYear===startYear+1 || end<=oneYearLater;
}

function addCalendarMonths(d, months){
  const out=new Date(d);
  const originalDay=out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth()+months);
  const lastDay=new Date(out.getFullYear(),out.getMonth()+1,0,12).getDate();
  out.setDate(Math.min(originalDay,lastDay));
  return out;
}

// Compatibilidade com o simulador ACT: os proporcionais são calculados por
// proporcionalidade direta do tempo trabalhado, convertendo a duração civil
// em meses + dias. Ex.: 01/01 a 24/12 => 11 meses + 24 dias => 11/12 + 24/365.
function actCivilFraction(periodStart,end,residualDayDenominator=365){
  const endExclusive=new Date(end.getTime()+dayMs);
  if(endExclusive<=periodStart) return 0;
  let months=(endExclusive.getFullYear()-periodStart.getFullYear())*12 + (endExclusive.getMonth()-periodStart.getMonth());
  let cursor=addCalendarMonths(periodStart,months);
  while(cursor>endExclusive && months>0){ months--; cursor=addCalendarMonths(periodStart,months); }
  while(addCalendarMonths(periodStart,months+1)<=endExclusive){ months++; cursor=addCalendarMonths(periodStart,months); }
  const remDays=Math.max(0,Math.round(daysBetween(cursor,endExclusive)));
  return Math.max(0,months/12 + remDays/residualDayDenominator);
}

function actDirectFraction(periodStart,end){
  // Férias/subsídios: convenção observada no simulador ACT, meses/12 + dias/365.
  return actCivilFraction(periodStart,end,365);
}

function actCompensationFraction(periodStart,end){
    // valorizado sobre 360 dias: 1 ano + 3 meses + 1/360.
  return actCivilFraction(periodStart,end,360);
}

function cessationYearFraction(start,end){
  const y=end.getFullYear();
  const ys=new Date(y,0,1,12);
  const effectiveStart=new Date(Math.max(start.getTime(),ys.getTime()));
  return clamp(actDirectFraction(effectiveStart,end),0,1);
}

function contractVacationFraction(start,end){
  // Compatibilidade ACT para o limite do art. 245.º/3:
  // duração civil total em meses + dias (meses/12 + dias/365).
    return Math.max(0,actDirectFraction(start,end));
}

function vacationModel(start,end,baseMonthly){
  if(!els.startDate.value||!els.endDate.value||end<start) return {special:false,vestedDays:0,propDays:0,vestedValue:0,propValue:0,fraction:0};
  const annualDays=22;
  const fraction=cessationYearFraction(start,end);
  const propDays=annualDays*fraction;
  const takenYear=Math.max(0,num('vacationTakenYear'));
  const jan1=new Date(end.getFullYear(),0,1,12);
  const hasVested=start<jan1;
  let vestedDays=hasVested?Math.max(0,annualDays-takenYear):0;
  let propDueDays=propDays;
  const special=isShortVacationCase(start,end);
  let capApplied=false;
  let capDays=null;
  let vestedValue=round2(baseMonthly*vestedDays/annualDays);
  let propValue=round2(baseMonthly*propDueDays/annualDays);
  let totalVacationEntitlementValue=null;

  if(special){
    // Art. 245.º/3 — compatibilidade com o caso de referência ACT:
    // direito monetário total = remuneração base × duração proporcional do contrato.
    // Os dias já gozados são abatidos a RB/22 por dia.
    const contractFraction=contractVacationFraction(start,end);
    capDays=annualDays*contractFraction;
    totalVacationEntitlementValue=round2(baseMonthly*contractFraction);

    const takenContract=takenYear;
    const takenValue=round2(takenContract*(baseMonthly/annualDays));
    const totalDueValue=Math.max(0,round2(totalVacationEntitlementValue-takenValue));

    vestedDays=0;
    propDueDays=Math.max(0,capDays-takenContract);
    vestedValue=0;
    propValue=totalDueValue;
    capApplied=true;
  }

  return {
    special,capApplied,capDays,fraction,totalVacationEntitlementValue,
    vestedDays:round2(vestedDays),
    propDays:round2(propDueDays),
    theoreticalPropDays:round2(propDays),
    vestedValue,
    propValue
  };
}
function priorDuodecimosFactor(start,end){
  // Estimates amounts already processed before the final payroll month.
  // For a worker already employed at 1 January this is exactly N completed
  // calendar months / 12. For admission during the year, start counting from
  // the admission month using the same monthly approximation.
  const y=end.getFullYear();
  const firstMonth=Math.max(0,start.getFullYear()===y?start.getMonth():0);
  const finalMonth=end.getMonth();
  const completedMonths=Math.max(0,finalMonth-firstMonth);
  return completedMonths/12;
}

function updateSubsidyUI(start=null,end=null){
  const mode=els.subsidyMode.value;
  const asksLump=mode!=='duodecimos';
  els.holidayReceivedWrap.hidden=!asksLump;
  els.christmasReceivedWrap.hidden=!asksLump;

  if(mode==='full'){
    els.holidayReceivedLabel.textContent='Subsídio de férias já recebido por inteiro (€)';
    els.subsidyHint.textContent='Pagamento por inteiro: indica o que já recebeste de subsídio de férias e, se aplicável, de Natal. O simulador calcula os direitos totais e deduz esses pagamentos.';
  } else if(mode==='mixed'){
    els.holidayReceivedLabel.textContent='Parcela de subsídio de férias já recebida por inteiro (€)';
    els.subsidyHint.textContent='Regime 50/50: o simulador estima os 50% em duodécimos já pagos antes do último recibo e permite indicar a parcela paga por inteiro.';
  } else {
    els.subsidyHint.textContent='100% em duodécimos: o simulador estima os duodécimos já pagos nos recibos anteriores e apura no fecho a diferença para os direitos legais totais.';
  }
}

function calculateLegalComp(){
  const start=date(els.startDate.value), end=date(els.endDate.value);
  if(!els.startDate.value||!els.endDate.value||end<=start) return 0;
  const salary=num('baseSalary')+num('seniorityPay');
  const RMMG=920;
  const cappedMonthly=Math.min(salary,20*RMMG);
  const daily=cappedMonthly/30;
  const endExclusive=new Date(end.getTime()+dayMs);
  let daysEquivalent=0;

  const D=(s)=>date(s);

  // Contratos integralmente abrangidos pelos 14 dias/ano:
  // usar a convenção civil observada no simulador ACT.
  if(start>=D('2023-05-01')){
    const fraction=actCompensationFraction(start,end);
    let total=daily*14*fraction;
    total=Math.min(total,12*salary,240*RMMG);
    return round2(total);
  }

  // Historic transitional segments for indefinite contracts. Fraction of year calculated proportionally.
  if(start < D('2011-11-01')){
    const d=overlapDays(start,endExclusive,start,D('2012-11-01'));
    daysEquivalent += (d/365.2425)*30;
  }
  const s20=new Date(Math.max(start.getTime(),D('2011-11-01').getTime()));
  if(s20 < D('2013-10-01')){
    const d=overlapDays(s20,endExclusive,s20,D('2013-10-01'));
    daysEquivalent += (d/365.2425)*20;
  }
  // 2013 reform: up to 18 days/year for the remainder of first 3 years when applicable; otherwise 12.
  const post2013Start=new Date(Math.max(start.getTime(),D('2013-10-01').getTime()));
  const pre2023End=D('2023-05-01');
  if(post2013Start < pre2023End && endExclusive>post2013Start){
    const thirdAnniv=new Date(start); thirdAnniv.setFullYear(start.getFullYear()+3);
    if(start < D('2013-10-01') && thirdAnniv>D('2013-10-01')){
      const d18=overlapDays(post2013Start,endExclusive,post2013Start,new Date(Math.min(thirdAnniv.getTime(),pre2023End.getTime())));
      daysEquivalent += (d18/365.2425)*18;
      const s12=new Date(Math.max(post2013Start.getTime(),thirdAnniv.getTime()));
      const d12=overlapDays(s12,endExclusive,s12,pre2023End);
      daysEquivalent += (d12/365.2425)*12;
    } else {
      const d12=overlapDays(post2013Start,endExclusive,post2013Start,pre2023End);
      daysEquivalent += (d12/365.2425)*12;
    }
  }
  // Agenda do Trabalho Digno: 14 days/year for service from 2023-05-01 onward.
  const post2023Start=new Date(Math.max(start.getTime(),D('2023-05-01').getTime()));
  if(endExclusive>post2023Start){
    const d=overlapDays(post2023Start,endExclusive,post2023Start,endExclusive);
    daysEquivalent += (d/365.2425)*14;
  }
  let total=daily*daysEquivalent;
  if(start<D('2011-11-01')) total=Math.max(total,3*salary);
  total=Math.min(total,12*salary,240*RMMG);
  return round2(total);
}

function addLine(lines,name,gross,irsValue,ssBase,meta='',group='salary'){
  const ss=round2(ssBase*num('ssRate')/100);
  const line={name,gross:round2(gross),irs:round2(irsValue),ss,net:round2(gross-irsValue-ss),meta,group};
  lines.push(line);
  return line;
}

function proportionalAutonomousIrs(entitlement,due,status,deps){
  entitlement=Math.max(0,round2(entitlement));
  due=clamp(round2(due),0,entitlement);
  if(entitlement<=0 || due<=0) return 0;
  // CIRS 99.º-C/6: quando o subsídio é fracionado, retém-se em cada
  // pagamento a parte proporcional do imposto calculado sobre o subsídio.
  return round2(irs(entitlement,status,deps)*(due/entitlement));
}


function irsRateInfo(amount,status,deps){
  amount=Math.max(0,Number(amount)||0);
  const tax=round2(irs(amount,status,deps));
  const effective=amount>0 ? (tax/amount)*100 : 0;

  // Marginal withholding rate from the same 2026 table row used by irs().
  // This is shown for audit/validation; effective rate is tax/base.
  const tables={
    single:[
      [920,0],[1042,12.5],[1108,15.7],[1154,15.7],[1212,21.2],[1819,24.1],
      [2119,31.1],[2499,34.9],[3305,38.36],[5547,39.69],[20221,44.95],[Infinity,47.17]
    ],
    sole:[
      [991,0],[1042,12.5],[1108,12.5],[1119,12.5],[1432,12.72],[1962,15.7],
      [2240,19.38],[2773,22.77],[3389,25.70],[5965,28.81],[20265,38.43],[Infinity,47.17]
    ]
  };
  const rows=status==='married_sole'?tables.sole:tables.single;
  let marginal=(rows.find(r=>amount<=r[0])||rows[rows.length-1])[1];
  if(status!=='married_sole' && deps>=3 && marginal>0) marginal=Math.max(0,marginal-1);
  return {tax,effective,marginal};
}

function rateMeta(label,base,tax,status,deps){
  const info=irsRateInfo(base,status,deps);
  return `${label}: base ${eurFmt.format(base)} · taxa marginal ${info.marginal.toFixed(2)}% · taxa efetiva ${(base>0?(tax/base*100):0).toFixed(2)}%`;
}

function allocateTax(totalTax, items){
  const totalBase=round2(items.reduce((s,i)=>s+Math.max(0,i.taxBase||0),0));
  const out={};
  if(totalTax<=0 || totalBase<=0){
    items.forEach(i=>out[i.key]=0);
    return out;
  }
  let allocated=0;
  items.forEach((item,idx)=>{
    const value = idx===items.length-1
      ? round2(totalTax-allocated)
      : round2(totalTax*(Math.max(0,item.taxBase||0)/totalBase));
    out[item.key]=Math.max(0,value);
    allocated=round2(allocated+out[item.key]);
  });
  return out;
}

function recalc(forceComp=false,renderTraining=true){
  const validDates=els.startDate.value&&els.endDate.value;
  const start=validDates?date(els.startDate.value):new Date(), end=validDates?date(els.endDate.value):new Date();
  const base=num('baseSalary'), seniority=num('seniorityPay'), monthly=base+seniority;
  if(forceComp || !els.legalComp.value) els.legalComp.value=calculateLegalComp().toFixed(2);
  const weeklyHours=Math.max(1,num('weeklyHours')||40);
  const trainingHourly=monthly>0 ? round2(monthly*12/(52*weeklyHours)) : 0;
  els.trainingHourly.value=trainingHourly.toFixed(2);
  updateSubsidyUI(start,end);
  if(renderTraining) renderTrainingYears();

  const status=els.taxStatus.value, deps=Math.max(0,Math.floor(num('dependents')));
  if(status==='single0') els.dependents.value=0;

  const salaryGross=monthly*clamp(num('salaryDays'),0,30)/30;
  const mealAllowance=Math.max(0,num('mealAllowance'));
  const mealAllowanceTaxable=clamp(num('mealAllowanceTaxable'),0,mealAllowance);
  const otherIrsOnly=Math.max(0,num('otherIrsOnly'));

  const vac=vacationModel(start,end,base);
  const vacationVestedGross=vac.vestedValue;
  const vacationPropGross=vac.propValue;

  // A ACT separa o subsídio de férias vencido do proporcional do ano da cessação.
  // No regime sem duodécimos, o valor já recebido abate apenas ao subsídio vencido,
  // não ao proporcional gerado no ano da cessação.
  const hasVestedAnnualHoliday = !vac.special && start < new Date(end.getFullYear(),0,1,12);
  const vestedHolidayAllowanceEntitlement = hasVestedAnnualHoliday ? base : 0;
  // No limite especial do art. 245.º/3, a ACT calcula um direito total de férias/
  // subsídio para toda a duração do contrato. O que já foi recebido em subsídio
  // é abatido a esse direito total.
  const proportionalHolidayAllowanceEntitlement = vac.special
    ? round2(vac.totalVacationEntitlementValue || 0)
    : vacationPropGross;
  const christmasEntitlement=round2(monthly*vac.fraction);
  const mode=els.subsidyMode.value;
  const priorFactor=priorDuodecimosFactor(start,end);
  let duoShare = 0;
  if (mode === 'duodecimos') duoShare = 1;
  else if (mode === 'mixed') duoShare = 0.5;
  const holidayDuosPaid=round2(monthly*priorFactor*duoShare);
  const christmasDuosPaid=round2(monthly*priorFactor*duoShare);
  const holidayLumpPaid=mode==='duodecimos'?0:Math.max(0,num('holidayReceived'));
  const christmasLumpPaid=mode==='duodecimos'?0:Math.max(0,num('christmasReceived'));

  let vestedHolidayAllowanceDue=0;
  let proportionalHolidayAllowanceDue=proportionalHolidayAllowanceEntitlement;
  let christmasDue=0;
  if(mode==='full'){
    if(vac.special){
      vestedHolidayAllowanceDue=0;
      proportionalHolidayAllowanceDue=Math.max(0,round2(proportionalHolidayAllowanceEntitlement-holidayLumpPaid));
    } else {
      vestedHolidayAllowanceDue=Math.max(0,round2(vestedHolidayAllowanceEntitlement-holidayLumpPaid));
      // Fora do limite especial, a ACT mantém separado o proporcional do ano.
      proportionalHolidayAllowanceDue=proportionalHolidayAllowanceEntitlement;
    }
    christmasDue=Math.max(0,round2(christmasEntitlement-christmasLumpPaid));
  } else {
    // Nos regimes com duodécimos, os pagamentos prévios são abatidos ao direito
    // total acumulado, começando pela componente vencida e depois pela proporcional.
    const holidayTotal=round2(vestedHolidayAllowanceEntitlement+proportionalHolidayAllowanceEntitlement);
    const holidayPaid=round2(holidayDuosPaid+holidayLumpPaid);
    const holidayDue=Math.max(0,round2(holidayTotal-holidayPaid));
    vestedHolidayAllowanceDue=Math.min(vestedHolidayAllowanceEntitlement,holidayDue);
    proportionalHolidayAllowanceDue=Math.max(0,round2(holidayDue-vestedHolidayAllowanceDue));
    christmasDue=Math.max(0,round2(christmasEntitlement-christmasDuosPaid-christmasLumpPaid));
  }
  const holidayAllowanceDue=round2(vestedHolidayAllowanceDue+proportionalHolidayAllowanceDue);
  const holidayAllowanceEntitlement=round2(vestedHolidayAllowanceEntitlement+proportionalHolidayAllowanceEntitlement);

  // Total comparável ao "Montante global" do simulador ACT:
  // compensação + férias + subsídio de férias + subsídio de Natal.
  // Não inclui salário do mês, formação, IRS/SS ou compensação extra manual.
  const actGrossTotal=round2(
    num('legalComp') +
    vacationVestedGross + vacationPropGross +
    holidayAllowanceDue +
    christmasDue
  );
  if(els.actGrossTotal) els.actGrossTotal.textContent=eurFmt.format(actGrossTotal);

  if(vac.special){
    els.vestedVacationDaysPreview.textContent='incluído no limite global';
    els.proportionalVacationDaysPreview.textContent=`${vac.propDays.toFixed(2)} dias equivalentes`;
  } else {
    els.vestedVacationDaysPreview.textContent=`${vac.vestedDays.toFixed(2)} dias`;
    els.proportionalVacationDaysPreview.textContent=`${vac.propDays.toFixed(2)} dias`;
  }
  els.cessationYearFractionPreview.textContent=new Intl.NumberFormat('pt-PT',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(vac.fraction);

  const trainingHours=totalTrainingDebt();
  const trainingGross=round2(trainingHours*trainingHourly);
  const legalComp=num('legalComp'), extraComp=num('extraComp'), compensation=round2(legalComp+extraComp);

  const service=validDates&&end>start?yearsExact(start,new Date(end.getTime()+dayMs)):0;
  let exemptLimit=num('avg12')*service;
  if(els.usedRelief5y.checked||els.newLink24m.checked) exemptLimit=0;

  // CIRS 2.º/4: apenas o excesso da compensação sobre o limite fiscal integra
  // a base tributável. O direito vencido (salário, férias, subsídios) fica fora
  // desta exclusão e segue as regras normais.
  // A compensação é fiscalmente avaliada como um único montante:
  // indemnização legal + indemnização extra. Se o total não ultrapassar o
  // limite do art. 2.º/4, nenhuma das duas linhas tem base sujeita a IRS.
  // A separação abaixo é APENAS visual para validação manual do simulador.
  const taxableComp=Math.max(0,round2(compensation-exemptLimit));
  const taxableLegalComp=compensation>0
    ? round2(taxableComp*(legalComp/compensation))
    : 0;
  const taxableExtraComp=round2(Math.max(0,taxableComp-taxableLegalComp));

  // Grupo normal de retenção mensal (CIRS 99.º-C/1-4).
  // Subsídios de férias e Natal ficam fora: têm retenção autónoma.
  const normalItemsWithExtra=[
    {key:'salary',taxBase:salaryGross},
    {key:'meal',taxBase:mealAllowanceTaxable},
    {key:'other',taxBase:otherIrsOnly},
    {key:'vacVested',taxBase:vacationVestedGross},
    {key:'vacProp',taxBase:vacationPropGross},
    {key:'training',taxBase:trainingGross},
    {key:'legalComp',taxBase:taxableLegalComp},
    {key:'extraComp',taxBase:taxableExtraComp}
  ];
  const normalTaxBaseWithExtra=round2(normalItemsWithExtra.reduce((s,i)=>s+i.taxBase,0));

  const normalItemsWithoutExtra=normalItemsWithExtra.filter(i=>i.key!=='extraComp');
  const normalTaxBaseWithoutExtra=round2(normalItemsWithoutExtra.reduce((s,i)=>s+i.taxBase,0));

  const normalIrsOverride=els.compTaxOverride.value.trim()===''?null:num('compTaxOverride');
  const normalIrsWithExtra=round2(normalIrsOverride??irs(normalTaxBaseWithExtra,status,deps));
  const normalIrsWithoutExtra=round2(irs(normalTaxBaseWithoutExtra,status,deps));
  const normalAlloc=allocateTax(normalIrsWithExtra,normalItemsWithExtra);
  const normalRateInfo=irsRateInfo(normalTaxBaseWithExtra,status,deps);
  const normalRateInfoWithoutExtra=irsRateInfo(normalTaxBaseWithoutExtra,status,deps);

  // Retenção autónoma dos subsídios. Quando apenas uma parte é paga no fecho,
  // aplica-se a proporção do imposto correspondente ao direito de referência.
  const vestedHolidayIrs=proportionalAutonomousIrs(
    vestedHolidayAllowanceEntitlement,
    vestedHolidayAllowanceDue,
    status,deps
  );
  const proportionalHolidayIrs=proportionalAutonomousIrs(
    proportionalHolidayAllowanceEntitlement,
    proportionalHolidayAllowanceDue,
    status,deps
  );
  const christmasIrs=proportionalAutonomousIrs(
    christmasEntitlement,
    christmasDue,
    status,deps
  );

  const lines=[];
  addLine(lines,'Remuneração mês final',salaryGross,normalAlloc.salary,salaryGross,
    `Grupo normal IRS · taxa marginal ${normalRateInfo.marginal.toFixed(2)}% · taxa efetiva do grupo ${(normalTaxBaseWithExtra>0?normalIrsWithExtra/normalTaxBaseWithExtra*100:0).toFixed(2)}% · base atribuída ${eurFmt.format(salaryGross)}`,'salary');

  if(mealAllowance>0)
    addLine(lines,'Subsídio de alimentação',mealAllowance,normalAlloc.meal,mealAllowanceTaxable,
      `Grupo normal IRS · taxa marginal ${normalRateInfo.marginal.toFixed(2)}% · taxa efetiva do grupo ${(normalTaxBaseWithExtra>0?normalIrsWithExtra/normalTaxBaseWithExtra*100:0).toFixed(2)}% · base tributável ${eurFmt.format(mealAllowanceTaxable)} · parcela isenta ${eurFmt.format(mealAllowance-mealAllowanceTaxable)}`,'salary');

  if(otherIrsOnly>0)
    addLine(lines,'Outros valores — apenas IRS',otherIrsOnly,normalAlloc.other,0,
      `${rateMeta('Grupo normal IRS',normalTaxBaseWithExtra,normalIrsWithExtra,status,deps)} · sem incidência de SS conforme classificação manual`,'salary');

  if(vacationVestedGross>0)
    addLine(lines,'Férias vencidas / não gozadas',vacationVestedGross,normalAlloc.vacVested,vacationVestedGross,
      `${vac.vestedDays.toFixed(2)} dias · ${rateMeta('grupo normal IRS',normalTaxBaseWithExtra,normalIrsWithExtra,status,deps)}`,'salary');

  if(vacationPropGross>0)
    addLine(lines,vac.special?'Férias devidas na cessação':'Férias proporcionais — ano da cessação',
      vacationPropGross,normalAlloc.vacProp,vacationPropGross,
      `${vac.propDays.toFixed(2)} dias${vac.capApplied?' · limite art. 245.º/3 aplicado':''} · ${rateMeta('grupo normal IRS',normalTaxBaseWithExtra,normalIrsWithExtra,status,deps)}`,'salary');

  if(vestedHolidayAllowanceEntitlement>0 || vestedHolidayAllowanceDue>0)
    addLine(lines,'Subsídio de férias vencido — saldo',
      vestedHolidayAllowanceDue,vestedHolidayIrs,vestedHolidayAllowanceDue,
      `${rateMeta('Retenção autónoma',vestedHolidayAllowanceEntitlement,irs(vestedHolidayAllowanceEntitlement,status,deps),status,deps)} · saldo pago ${eurFmt.format(vestedHolidayAllowanceDue)}`,'salary');

  if(proportionalHolidayAllowanceDue>0)
    addLine(lines,'Subsídio de férias proporcional',
      proportionalHolidayAllowanceDue,proportionalHolidayIrs,proportionalHolidayAllowanceDue,
      `${rateMeta('Retenção autónoma',proportionalHolidayAllowanceEntitlement,irs(proportionalHolidayAllowanceEntitlement,status,deps),status,deps)} · saldo pago ${eurFmt.format(proportionalHolidayAllowanceDue)}`,'salary');

  if(christmasDue>0)
    addLine(lines,'Subsídio de Natal proporcional — saldo',
      christmasDue,christmasIrs,christmasDue,
      `${rateMeta('Retenção autónoma',christmasEntitlement,irs(christmasEntitlement,status,deps),status,deps)} · saldo pago ${eurFmt.format(christmasDue)}`,'salary');

  if(trainingGross>0)
    addLine(lines,'Créditos de formação',trainingGross,normalAlloc.training,0,
      `${rateMeta('Categoria A · grupo normal IRS',normalTaxBaseWithExtra,normalIrsWithExtra,status,deps)} · sem SS segundo jurisprudência TCAS de 26-09-2024`,'training');

  addLine(lines,'Indemnização legal',legalComp,normalAlloc.legalComp,0,
    `${rateMeta('Grupo normal IRS',normalTaxBaseWithExtra,normalIrsWithExtra,status,deps)} · compensação total ${eurFmt.format(compensation)} · limite ${eurFmt.format(exemptLimit)} · excesso tributável total ${eurFmt.format(taxableComp)} · quota visual desta linha ${eurFmt.format(taxableLegalComp)}`,'legalComp');

  if(extraComp>0)
    addLine(lines,'Indemnização extra',extraComp,normalAlloc.extraComp,0,
      `${rateMeta('Grupo normal IRS',normalTaxBaseWithExtra,normalIrsWithExtra,status,deps)} · compensação total ${eurFmt.format(compensation)} · limite ${eurFmt.format(exemptLimit)} · excesso tributável total ${eurFmt.format(taxableComp)} · quota visual desta linha ${eurFmt.format(taxableExtraComp)}`,'extraComp');

  const totals=lines.reduce((a,l)=>({gross:a.gross+l.gross,irs:a.irs+l.irs,ss:a.ss+l.ss,net:a.net+l.net}),{gross:0,irs:0,ss:0,net:0});
  for(const k in totals) totals[k]=round2(totals[k]);

  els.trainingCreditPreview.textContent=eurFmt.format(trainingGross);
  els.trainingHoursTotal.textContent=`${trainingHours.toFixed(2)} h`;
  els.lines.innerHTML=lines.map(l=>`<tr><td>${l.name}${l.meta?`<small>${l.meta}</small>`:''}</td><td>${eurFmt.format(l.gross)}</td><td>${eurFmt.format(l.irs)}</td><td>${eurFmt.format(l.ss)}</td><td><strong>${eurFmt.format(l.net)}</strong></td></tr>`).join('');
  els.tGross.textContent=eurFmt.format(totals.gross); els.tIRS.textContent=eurFmt.format(totals.irs); els.tSS.textContent=eurFmt.format(totals.ss); els.tNet.textContent=eurFmt.format(totals.net);
  els.netTotal.textContent=eurFmt.format(totals.net); els.grossSummary.textContent=`Bruto ${eurFmt.format(totals.gross)} · Descontos ${eurFmt.format(totals.irs+totals.ss)}`;
  els.compTotal.textContent=eurFmt.format(compensation); els.compExemptLimit.textContent=eurFmt.format(exemptLimit); els.compTaxable.textContent=eurFmt.format(taxableComp); els.serviceYears.textContent=`${service.toFixed(2)} anos`;

  const groupNet=(group)=>round2(lines.filter(l=>l.group===group).reduce((sum,l)=>sum+l.net,0));
  const salaryRightsNet=groupNet('salary');
  const trainingNet=groupNet('training');
  const legalCompNet=groupNet('legalComp');
  const extraCompNet=groupNet('extraComp');

  const netWithExtra=totals.net;
  // Cenário alternativo completo: retira o extra bruto e recalcula a retenção
  // do grupo normal sem a parcela tributável incremental do extra.
  const netWithoutExtra=round2(
    totals.gross-extraComp
    - totals.ss
    - (totals.irs-normalIrsWithExtra+normalIrsWithoutExtra)
  );
  const netExtraDifference=round2(netWithExtra-netWithoutExtra);

  if(els.netSalaryRights) els.netSalaryRights.textContent=eurFmt.format(salaryRightsNet);
  if(els.netTraining) els.netTraining.textContent=eurFmt.format(trainingNet);
  if(els.netLegalComp) els.netLegalComp.textContent=eurFmt.format(legalCompNet);
  if(els.netExtraComp) els.netExtraComp.textContent=eurFmt.format(extraCompNet);
  if(els.netWithExtra) els.netWithExtra.textContent=eurFmt.format(netWithExtra);
  if(els.netWithoutExtra) els.netWithoutExtra.textContent=eurFmt.format(netWithoutExtra);
  if(els.netExtraDifference) els.netExtraDifference.textContent=eurFmt.format(netExtraDifference);
  if(els.extraGrossHint) els.extraGrossHint.textContent=`Extra bruto ${eurFmt.format(extraComp)}`;
  if(els.netBreakdown && els.showNetBreakdown) els.netBreakdown.hidden=!els.showNetBreakdown.checked;

  const warnings=[];
  warnings.push(`IRS grupo normal: base ${eurFmt.format(normalTaxBaseWithExtra)} · taxa marginal ${normalRateInfo.marginal.toFixed(2)}% · taxa efetiva ${(normalTaxBaseWithExtra>0?normalIrsWithExtra/normalTaxBaseWithExtra*100:0).toFixed(2)}% · retenção ${eurFmt.format(normalIrsWithExtra)}. Cenário sem extra: base ${eurFmt.format(normalTaxBaseWithoutExtra)} · marginal ${normalRateInfoWithoutExtra.marginal.toFixed(2)}% · efetiva ${(normalTaxBaseWithoutExtra>0?normalIrsWithoutExtra/normalTaxBaseWithoutExtra*100:0).toFixed(2)}%. Subsídios de férias e Natal têm retenção autónoma.`);
  warnings.push(`Compensação para IRS: indemnização legal + extra são avaliadas em conjunto (${eurFmt.format(compensation)}). Limite fiscal estimado ${eurFmt.format(exemptLimit)}; apenas o excesso de ${eurFmt.format(taxableComp)} é tributável. A divisão desse excesso e do IRS entre as duas linhas é apenas visual para validação manual.`);
  if(otherIrsOnly>0) warnings.push('Outros valores do último salário: a aplicação assume, conforme indicado no campo, incidência em IRS e ausência de incidência em Segurança Social. Confirma a classificação da verba no recibo/contrato, porque a incidência depende da natureza concreta do pagamento.');
  if(mealAllowance>0 && mealAllowanceTaxable===0) warnings.push('Subsídio de alimentação: foi considerada isenta a totalidade do valor introduzido. Se existir uma parcela acima do limite de isenção aplicável, indica-a no campo “Parcela sujeita a IRS/SS”.');
  if(start<date('2013-10-01')) warnings.push('Contrato anterior a 1/10/2013: o regime transitório da compensação tem limites e particularidades. Confirma o valor no simulador da ACT; o campo continua editável.');
  if(vac.capApplied) warnings.push(`Férias: aplicado o limite especial do artigo 245.º, n.º 3. Direito global estimado ${eurFmt.format(vac.totalVacationEntitlementValue||0)}; os dias já gozados são abatidos a ${eurFmt.format(base/22)} por dia.`);
  else warnings.push('Férias: foram considerados 22 dias vencidos a 1 de janeiro (quando aplicável), abatendo os dias gozados, e os proporcionais segundo a proporcionalidade direta usada pela ACT (meses/12 + dias/365).');
  if(mode!=='full') warnings.push(`Subsídios: foram estimados ${eurFmt.format(holidayDuosPaid)} de subsídio de férias e ${eurFmt.format(christmasDuosPaid)} de subsídio de Natal já pagos em duodécimos antes do recibo final.`);
  if(els.usedRelief5y.checked) warnings.push('Assinalaste utilização do regime fiscal nos últimos 5 anos: nesta simulação a compensação é tratada como totalmente tributável para IRS.');
  if(els.newLink24m.checked) warnings.push('Assinalaste novo vínculo com a mesma entidade nos 24 meses seguintes: nesta simulação a compensação é tratada como totalmente tributável para IRS.');
  if(normalIrsOverride!==null) warnings.push('Foi usado um override manual para o IRS total do grupo normal. O cenário “sem extra” continua a ser recalculado automaticamente pelas tabelas de 2026, pelo que o comparativo deve ser interpretado como estimativa.');
  if(els.contractType.value==='indefinite') warnings.push('Formação: em modo ACT, o contrato sem termo considera 40 h por cada ano civil da janela, incluindo anos parciais.');
  else warnings.push('Formação: nos contratos a termo com duração igual ou superior a 3 meses, o artigo 131.º, n.º 2 prevê proporcionalidade no ano.');
  warnings.push('A retenção de IRS apresentada é uma estimativa do recibo; a liquidação anual de IRS pode produzir um resultado diferente.');
  els.warnings.innerHTML=warnings.map((w,i)=>`<div class="warning ${i>1?'info':''}">${w}</div>`).join('');
}

function initApp(){
  try {
    document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>recalc(false,true)));
    els.startDate.addEventListener('change',()=>recalc(false,true));
    els.endDate.addEventListener('change',()=>recalc(false,true));
    els.useAutoComp.addEventListener('click',()=>recalc(true));
    els.printBtn.addEventListener('click',()=>window.print());
    recalc(true);
  } catch (error) {
    console.error('Erro ao iniciar o simulador:', error);
    const errorBox = document.getElementById('appError');
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = 'O simulador encontrou um erro ao iniciar: ' + (error?.message || error);
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();
