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


## v9 — motor fiscal por grupos de retenção

A retenção deixou de ser calculada isoladamente rubrica a rubrica.

### Grupo normal de Categoria A
São agregadas numa única base de retenção, quando aplicável:
- remuneração do mês final;
- parcela tributável do subsídio de alimentação;
- outros abonos classificados como sujeitos a IRS;
- remuneração de férias não gozadas / férias proporcionais;
- créditos de formação;
- parte tributável da compensação legal;
- parte tributável incremental da compensação extra.

A tabela de retenção de 2026 é aplicada uma vez à base agregada. O IRS mostrado em cada linha é depois repartido proporcionalmente pelas bases tributáveis apenas para apresentação.

### Subsídios
Subsídio de férias e subsídio de Natal são tratados com retenção autónoma. Quando apenas parte de um subsídio é paga no recibo final, é aplicada a proporção do imposto calculado sobre o respetivo direito de referência.

### Comparativo com / sem compensação extra
O cenário sem extra recalcula a base normal e a retenção respetiva, em vez de simplesmente subtrair o valor bruto da compensação adicional.

### Segurança Social
A incidência contributiva continua a ser apurada por rubrica:
- remuneração, férias e subsídios: sujeitos;
- créditos de formação: sem incidência, seguindo o acórdão TCAS de 26-09-2024;
- compensações de cessação nos motivos atualmente suportados pelo simulador: sem incidência;
- subsídio de alimentação: apenas a parcela indicada como sujeita;
- outros valores: conforme classificação manual apresentada na interface.


## v9.2 — taxas de IRS para validação manual

O detalhe de cada rubrica apresenta agora:
- taxa marginal da linha da tabela de retenção de 2026 utilizada;
- taxa efetiva de retenção (`IRS / base tributável`);
- base tributável relevante.

Nas rubricas pertencentes ao grupo normal, a taxa apresentada é a do grupo agregado — não uma taxa artificial calculada isoladamente para a rubrica. Nos subsídios de férias e Natal é mostrada a taxa da respetiva retenção autónoma. O resumo também mostra as taxas do cenário com e sem indemnização extra.
