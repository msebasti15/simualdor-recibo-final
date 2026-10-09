/* Caso sintético: pagamentos anteriores não podem desaparecer no modo full. */
const assert=require('node:assert/strict');
function due(vested,proportional,paid){
 const vestedDue=Math.max(0,+(vested-paid).toFixed(2));
 const beyond=Math.max(0,+(paid-vested).toFixed(2));
 const proportionalDue=Math.max(0,+(proportional-beyond).toFixed(2));
 return +(vestedDue+proportionalDue).toFixed(2);
}
assert.equal(due(3000,1500,3500),1000);
assert.equal(due(3000,1500,5000),0);
assert.equal(due(3000,1500,1000),3500);
console.log('Synthetic holiday prior-payment allocation OK');
