# Simulador de Recibo Final — Portugal 2026

Webapp estática para estimar valores de cessação de contrato em Portugal.

## Funcionalidades

- remuneração do mês final;
- férias e subsídios devidos;
- créditos de formação com valor/hora automático;
- compensação legal estimada;
- estimativa de IRS e Segurança Social;
- comparação de direitos de cessação com a metodologia observada no simulador ACT.

## Testes

Todos os testes e exemplos deste repositório usam exclusivamente **dados sintéticos**. Não devem ser adicionados dados laborais pessoais reais a fixtures, documentação ou código.

Executar o teste de regressão:

```bash
node tests/act-regression.js
```

## Nota

Ferramenta de simulação; não substitui aconselhamento jurídico, fiscal ou contabilístico.


## v8 — decomposição do valor líquido

O painel de resultados pode separar o líquido estimado em:
- salário, férias e subsídios;
- créditos de formação;
- indemnização legal;
- indemnização extra.

É apresentado um comparativo entre o líquido final com e sem indemnização extra. A diferença considera o impacto estimado do IRS da parcela adicional, em vez de simplesmente subtrair o valor bruto extra.


## v8.1 — último salário

Foram acrescentadas rubricas para:
- subsídio de alimentação devido no último mês;
- parcela do subsídio de alimentação sujeita a IRS e Segurança Social;
- outros valores do último salário sujeitos apenas a IRS, sem Segurança Social.

A retenção de IRS da remuneração mensal, da parcela tributável do subsídio de alimentação e das outras verbas IRS-only é calculada sobre a respetiva base tributável conjunta e depois repartida pelas linhas para apresentação.

A classificação fiscal/contributiva de subsídios de teletrabalho, transporte e outras verbas depende da natureza concreta do pagamento. O campo “apenas IRS” é, por isso, uma opção explícita do utilizador e não uma classificação automática.
