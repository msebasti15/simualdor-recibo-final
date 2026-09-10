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

function cessationYearFraction(start,end){
  const y=end.getFullYear();
  const ys=new Date(y,0,1,12), ye=new Date(y+1,0,1,12);
  const effectiveStart=new Date(Math.max(start.getTime(),ys.getTime()));
  const endExclusive=new Date(end.getTime()+dayMs);
  return clamp((Math.min(endExclusive.getTime(),ye.getTime())-effectiveStart.getTime())/(ye-ys),0,1);
}

function contractVacationFraction(start,end){
  // Used only for the special cap in CT art. 245.º/3. The cap is proportional
  // to the total duration of the contract, applying the 22-day annual reference.
  return Math.max(0,daysBetween(start,new Date(end.getTime()+dayMs))/365.2425);
}

function vacationModel(start,end,monthly){
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

  if(special){
    capDays=annualDays*contractVacationFraction(start,end);
    const takenContract=end.getFullYear()===start.getFullYear()
      ? takenYear
      : Math.max(0,num('vacationTakenContract'));
    const totalDueDays=Math.max(0,capDays-takenContract);
    // Under art. 245.º/3 the total vacation entitlement/remuneration is capped.
    // We aggregate the remaining entitlement in the proportional line to avoid
    // double counting a vested 22-day block plus the cessation-year proportional.
    vestedDays=0;
    propDueDays=totalDueDays;
    capApplied=true;
  }

  return {
    special,capApplied,capDays,fraction,
    vestedDays:round2(vestedDays),
    propDays:round2(propDueDays),
    theoreticalPropDays:round2(propDays),
    vestedValue:round2(monthly*vestedDays/annualDays),
    propValue:round2(monthly*propDueDays/annualDays)
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
  if(start&&end&&end>=start) els.specialVacationTakenWrap.hidden=!isShortVacationCase(start,end);

  if(mode==='full'){
    els.holidayReceivedWrap.firstChild.textContent='Subsídio de férias já recebido por inteiro (€)';
    els.subsidyHint.textContent='Pagamento por inteiro: indica o que já recebeste de subsídio de férias e, se aplicável, de Natal. O simulador calcula os direitos totais e deduz esses pagamentos.';
  } else if(mode==='mixed'){
    els.holidayReceivedWrap.firstChild.textContent='Parcela de subsídio de férias já recebida por inteiro (€)';
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

function addLine(lines,name,gross,irsValue,ssBase,meta=''){
  const ss=round2(ssBase*num('ssRate')/100);
  lines.push({name,gross:round2(gross),irs:round2(irsValue),ss,net:round2(gross-irsValue-ss),meta});
}

function recalc(forceComp=false,renderTraining=true){
  const validDates=els.startDate.value&&els.endDate.value;
  const start=validDates?date(els.startDate.value):new Date(), end=validDates?date(els.endDate.value):new Date();
  const base=num('baseSalary'), seniority=num('seniorityPay'), monthly=base+seniority;
  if(forceComp || !els.legalComp.value) els.legalComp.value=calculateLegalComp().toFixed(2);
  const trainingMonthly=monthly+num('trainingComplements');
  const weeklyHours=Math.max(1,num('weeklyHours')||40);
  if(monthly>0) els.trainingHourly.value=(trainingMonthly*12/(52*weeklyHours)).toFixed(2);
  updateSubsidyUI(start,end);
  if(renderTraining) renderTrainingYears();

  const status=els.taxStatus.value, deps=Math.max(0,Math.floor(num('dependents')));
  if(status==='single0') els.dependents.value=0;

  const salaryGross=monthly*clamp(num('salaryDays'),0,30)/30;
  const vac=vacationModel(start,end,monthly);
  const vacationVestedGross=vac.vestedValue;
  const vacationPropGross=vac.propValue;

  // Holiday allowance has the same underlying remaining vacation rights in this
  // simplified general-regime model. Payment mode changes what was already paid,
  // not the legal entitlement generated at cessation.
  const holidayAllowanceEntitlement=vacationVestedGross+vacationPropGross;
  const christmasEntitlement=round2(monthly*vac.fraction);
  const mode=els.subsidyMode.value;
  const priorFactor=priorDuodecimosFactor(start,end);
  const duoShare=mode==='duodecimos'?1:(mode==='mixed'?.5:0);
  const holidayDuosPaid=round2(monthly*priorFactor*duoShare);
  const christmasDuosPaid=round2(monthly*priorFactor*duoShare);
  const holidayLumpPaid=mode==='duodecimos'?0:Math.max(0,num('holidayReceived'));
  const christmasLumpPaid=mode==='duodecimos'?0:Math.max(0,num('christmasReceived'));
  const holidayAllowanceDue=Math.max(0,round2(holidayAllowanceEntitlement-holidayDuosPaid-holidayLumpPaid));
  const christmasDue=Math.max(0,round2(christmasEntitlement-christmasDuosPaid-christmasLumpPaid));

  els.vestedVacationDaysPreview.textContent=`${vac.vestedDays.toFixed(2)} dias`;
  els.proportionalVacationDaysPreview.textContent=`${vac.propDays.toFixed(2)} dias`;
  els.cessationYearFractionPreview.textContent=new Intl.NumberFormat('pt-PT',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(vac.fraction);

  const trainingHours=totalTrainingDebt();
  const trainingGross=trainingHours*num('trainingHourly');
  const legalComp=num('legalComp'), extraComp=num('extraComp'), compensation=legalComp+extraComp;

  const service=validDates&&end>start?yearsExact(start,new Date(end.getTime()+dayMs)):0;
  let exemptLimit=num('avg12')*service;
  if(els.usedRelief5y.checked||els.newLink24m.checked) exemptLimit=0;
  const taxableComp=Math.max(0,compensation-exemptLimit);
  const compIrsOverride=els.compTaxOverride.value.trim()===''?null:num('compTaxOverride');

  const lines=[];
  addLine(lines,'Remuneração mês final',salaryGross,irs(salaryGross,status,deps),salaryGross);
  if(vacationVestedGross>0) addLine(lines,'Férias vencidas / não gozadas',vacationVestedGross,irs(vacationVestedGross,status,deps),vacationVestedGross,`${vac.vestedDays.toFixed(2)} dias`);
  addLine(lines,vac.special?'Férias devidas na cessação':'Férias proporcionais — ano da cessação',vacationPropGross,irs(vacationPropGross,status,deps),vacationPropGross,`${vac.propDays.toFixed(2)} dias${vac.capApplied?' · limite art. 245.º/3 aplicado':''}`);
  addLine(lines,'Subsídio de férias — saldo final',holidayAllowanceDue,irs(holidayAllowanceDue,status,deps),holidayAllowanceDue,`Direito ${eurFmt.format(holidayAllowanceEntitlement)} · já considerado pago ${eurFmt.format(holidayDuosPaid+holidayLumpPaid)}`);
  addLine(lines,'Subsídio de Natal — saldo final',christmasDue,irs(christmasDue,status,deps),christmasDue,`Direito proporcional ${eurFmt.format(christmasEntitlement)} · já considerado pago ${eurFmt.format(christmasDuosPaid+christmasLumpPaid)}`);
  addLine(lines,'Créditos de formação',trainingGross,irs(trainingGross,status,deps),0,'Sem SS na presente versão');
  addLine(lines,'Compensação legal + adicional',compensation,compIrsOverride??irs(taxableComp,status,deps),0,'IRS apenas sobre parcela tributável estimada');

  const totals=lines.reduce((a,l)=>({gross:a.gross+l.gross,irs:a.irs+l.irs,ss:a.ss+l.ss,net:a.net+l.net}),{gross:0,irs:0,ss:0,net:0});
  for(const k in totals) totals[k]=round2(totals[k]);

  els.trainingCreditPreview.textContent=eurFmt.format(trainingGross);
  els.trainingHoursTotal.textContent=`${trainingHours.toFixed(2)} h`;
  els.lines.innerHTML=lines.map(l=>`<tr><td>${l.name}${l.meta?`<small>${l.meta}</small>`:''}</td><td>${eurFmt.format(l.gross)}</td><td>${eurFmt.format(l.irs)}</td><td>${eurFmt.format(l.ss)}</td><td><strong>${eurFmt.format(l.net)}</strong></td></tr>`).join('');
  els.tGross.textContent=eurFmt.format(totals.gross); els.tIRS.textContent=eurFmt.format(totals.irs); els.tSS.textContent=eurFmt.format(totals.ss); els.tNet.textContent=eurFmt.format(totals.net);
  els.netTotal.textContent=eurFmt.format(totals.net); els.grossSummary.textContent=`Bruto ${eurFmt.format(totals.gross)} · Descontos ${eurFmt.format(totals.irs+totals.ss)}`;
  els.compTotal.textContent=eurFmt.format(compensation); els.compExemptLimit.textContent=eurFmt.format(exemptLimit); els.compTaxable.textContent=eurFmt.format(taxableComp); els.serviceYears.textContent=`${service.toFixed(2)} anos`;

  const warnings=[];
  if(start<date('2013-10-01')) warnings.push('Contrato anterior a 1/10/2013: o regime transitório da compensação tem limites e particularidades. Confirma o valor no simulador da ACT; o campo continua editável.');
  if(vac.capApplied) warnings.push(`Férias: foi aplicado o limite especial do artigo 245.º, n.º 3. O teto estimado para a duração total do contrato é ${vac.capDays.toFixed(2)} dias; confirma os dias gozados desde a admissão.`);
  else warnings.push('Férias: foram considerados 22 dias vencidos a 1 de janeiro (quando aplicável), abatendo os dias gozados no ano, mais os proporcionais pelo tempo de serviço no ano da cessação.');
  if(mode!=='full') warnings.push(`Subsídios: foram estimados ${eurFmt.format(holidayDuosPaid)} de subsídio de férias e ${eurFmt.format(christmasDuosPaid)} de subsídio de Natal já pagos em duodécimos antes do recibo final.`);
  if(els.usedRelief5y.checked) warnings.push('Assinalaste utilização do regime fiscal nos últimos 5 anos: nesta simulação a compensação é tratada como totalmente tributável para IRS.');
  if(els.newLink24m.checked) warnings.push('Assinalaste novo vínculo com a mesma entidade nos 24 meses seguintes: nesta simulação a compensação é tratada como totalmente tributável para IRS.');
  if(els.contractType.value==='indefinite') warnings.push('Formação: em modo ACT, o contrato sem termo considera 40 h por cada ano civil da janela, incluindo anos parciais.');
  else warnings.push('Formação: nos contratos a termo com duração igual ou superior a 3 meses, o artigo 131.º, n.º 2 prevê proporcionalidade no ano.');
  warnings.push('A retenção de IRS apresentada é uma estimativa do recibo; a liquidação anual de IRS pode produzir um resultado diferente.');
  els.warnings.innerHTML=warnings.map((w,i)=>`<div class="warning ${i>1?'info':''}">${w}</div>`).join('');
}

document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>recalc(false,true)));
els.startDate.addEventListener('change',()=>recalc(false,true));
els.endDate.addEventListener('change',()=>recalc(false,true));
els.useAutoComp.addEventListener('click',()=>recalc(true));
els.printBtn.addEventListener('click',()=>window.print());
recalc(true);
