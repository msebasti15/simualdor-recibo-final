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
