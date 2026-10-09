# Validação técnica e fiscal — v15 (09/10/2026)

**Estado: validação técnica parcial; NÃO CERTIFICADO para recibo final real.**

## Correções efetivamente realizadas
1. IRS: estado “não casado sem dependentes” ignora sempre o número de dependentes introduzido anteriormente, inclusive no cálculo atual.
2. Subsídio de férias no regime normal, pagamento integral: valores previamente recebidos que excedam a parcela vencida passam a abater também ao saldo proporcional, evitando dupla contabilização do mesmo pagamento. O saldo negativo nunca gera desconto automático.
3. Avisos adicionais para a média de remunerações de 12 meses e para férias especiais quando existiram aumentos salariais.
4. Testes de valores de referência da AT (2026), testes sintéticos de pagamentos anteriores e testes de regressão anteriores.

## Limitações que impedem certificação
- A média fiscal usa os 12 meses civis **anteriores** ao mês de cessação. Deve confirmar-se com a folha salarial a janela legal concreta e a inclusão de rubricas regulares tributáveis.
- Férias em contratos que cessam no ano seguinte ao da admissão: a aplicação usa uma aproximação monetária ACT à remuneração base atual; aumentos salariais e pagamentos históricos podem exigir reconciliação de direitos por ano.
- Subsídios pagos em anos diferentes não são liquidados autonomamente por ano de referência para efeitos de retenção no acerto.
- Duodécimos anteriores são estimados, não importados dos recibos efetivos.
- Incidência contributiva sobre compensação por mútuo acordo exige confirmação do enquadramento jurídico.
- A retenção mensal não equivale à liquidação anual de IRS.
- Os testes de fronteiras dos escalões são verificações de integridade, não confronto exaustivo de cada linha com o diploma.

## Referências
- [Circular n.º 1/2026 — AT](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Circular_1_2026.pdf)
- [FAQ oficial AT — exemplos 2026](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/Pages/faqs-00569.aspx)
- [Código do Trabalho, art. 245.º](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475-46747075)
- [CIRS, art. 2.º](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx)

Os testes são realizados apenas com dados sintéticos, sem dados pessoais.
