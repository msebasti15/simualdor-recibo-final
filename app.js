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

function recalc(forceComp=false){
  const start=date(els.startDate.value), end=date(els.endDate.value);
  const base=num('baseSalary'), seniority=num('seniorityPay'), monthly=base+seniority;
  if(forceComp || !els.legalComp.value) els.legalComp.value=calculateLegalComp().toFixed(2);
  if(!els.trainingHourly.value && monthly>0) els.trainingHourly.value=(monthly*12/(52*40)).toFixed(2);

  const status=els.taxStatus.value, deps=Math.max(0,Math.floor(num('dependents')));
  if(status==='single0') els.dependents.value=0;

  const salaryGross=monthly*clamp(num('salaryDays'),0,30)/30;
  const vacationGross=monthly*clamp(num('vacationDays'),0,100)/22;
  const vacationAllowanceGross=vacationGross;
  const holidayProp=monthly*clamp(num('holidayMonths'),0,12)/12;
  const christmasProp=monthly*clamp(num('christmasMonths'),0,12)/12;
  const trainingGross=num('trainingHours')*num('trainingHourly');
  const legalComp=num('legalComp'), extraComp=num('extraComp'), compensation=legalComp+extraComp;

  const service=els.startDate.value&&els.endDate.value&&end>start?yearsExact(start,new Date(end.getTime()+dayMs)):0;
  let exemptLimit=num('avg12')*service;
  if(els.usedRelief5y.checked||els.newLink24m.checked) exemptLimit=0;
  const taxableComp=Math.max(0,compensation-exemptLimit);
  const compIrsOverride=els.compTaxOverride.value.trim()===''?null:num('compTaxOverride');

  const lines=[];
  addLine(lines,'Remuneração mês final',salaryGross,irs(salaryGross,status,deps),salaryGross);
  addLine(lines,'Férias vencidas / não gozadas',vacationGross,irs(vacationGross,status,deps),vacationGross);
  addLine(lines,'Subsídio de férias — férias vencidas',vacationAllowanceGross,irs(vacationAllowanceGross,status,deps),vacationAllowanceGross);
  addLine(lines,'Subsídio de férias proporcional',holidayProp,irs(holidayProp,status,deps),holidayProp);
  addLine(lines,'Subsídio de Natal proporcional',christmasProp,irs(christmasProp,status,deps),christmasProp);
  // TCAS 26-09-2024: training amounts due at termination are not included in SS contribution base.
  addLine(lines,'Créditos de formação',trainingGross,irs(trainingGross,status,deps),0,'Sem SS na presente versão');
  // Legal/extra severance grouped. SS excluded for supported dismissal reasons under CRC art. 48(h).
  addLine(lines,'Compensação legal + adicional',compensation,compIrsOverride??irs(taxableComp,status,deps),0,'IRS apenas sobre parcela tributável estimada');

  const totals=lines.reduce((a,l)=>({gross:a.gross+l.gross,irs:a.irs+l.irs,ss:a.ss+l.ss,net:a.net+l.net}),{gross:0,irs:0,ss:0,net:0});
  for(const k in totals) totals[k]=round2(totals[k]);

  els.lines.innerHTML=lines.map(l=>`<tr><td>${l.name}${l.meta?`<small>${l.meta}</small>`:''}</td><td>${eurFmt.format(l.gross)}</td><td>${eurFmt.format(l.irs)}</td><td>${eurFmt.format(l.ss)}</td><td><strong>${eurFmt.format(l.net)}</strong></td></tr>`).join('');
  els.tGross.textContent=eurFmt.format(totals.gross); els.tIRS.textContent=eurFmt.format(totals.irs); els.tSS.textContent=eurFmt.format(totals.ss); els.tNet.textContent=eurFmt.format(totals.net);
  els.netTotal.textContent=eurFmt.format(totals.net); els.grossSummary.textContent=`Bruto ${eurFmt.format(totals.gross)} · Descontos ${eurFmt.format(totals.irs+totals.ss)}`;
  els.compTotal.textContent=eurFmt.format(compensation); els.compExemptLimit.textContent=eurFmt.format(exemptLimit); els.compTaxable.textContent=eurFmt.format(taxableComp); els.serviceYears.textContent=`${service.toFixed(2)} anos`;

  const warnings=[];
  if(start<date('2013-10-01')) warnings.push('Contrato anterior a 1/10/2013: o regime transitório tem limites e particularidades. Confirma o valor da compensação no simulador da ACT; podes substituir manualmente o resultado.');
  if(els.usedRelief5y.checked) warnings.push('Assinalaste utilização do regime nos últimos 5 anos: nesta simulação a compensação é tratada como totalmente tributável para IRS.');
  if(els.newLink24m.checked) warnings.push('Assinalaste novo vínculo com a mesma entidade nos 24 meses seguintes: nesta simulação a compensação é tratada como totalmente tributável para IRS.');
  warnings.push('A retenção de IRS da parcela tributável da compensação é uma estimativa de recibo. O imposto final depende da liquidação anual e do processamento concreto da entidade pagadora.');
  warnings.push('Férias e proporcionais podem variar com datas, férias já gozadas, regras internas/CCT e outras parcelas remuneratórias. Os campos são editáveis para reconciliação com o recibo real.');
  els.warnings.innerHTML=warnings.map((w,i)=>`<div class="warning ${i>1?'info':''}">${w}</div>`).join('');
}

document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>recalc(false)));
els.useAutoComp.addEventListener('click',()=>recalc(true));
els.printBtn.addEventListener('click',()=>window.print());
recalc(true);
