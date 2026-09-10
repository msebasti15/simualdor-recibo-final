# Simulador de Recibo Final — Portugal 2026

Webapp estática, sem backend, sem base de dados e sem dependências externas em runtime.

## Executar

A forma mais simples é servir a pasta como site estático:

```bash
python3 -m http.server 8080
```

Depois abrir `http://localhost:8080`.

Também pode ser publicada diretamente em GitHub Pages, Cloudflare Pages, Netlify ou qualquer alojamento estático.

## O que calcula nesta v1

- remuneração do mês final;
- férias vencidas/não gozadas e respetivo subsídio;
- subsídio de férias proporcional;
- subsídio de Natal proporcional;
- créditos de formação;
- compensação mínima legal estimada para contrato sem termo em despedimento coletivo/extinção do posto/inadaptação, incluindo segmentos históricos e a alteração para 14 dias/ano desde 01-05-2023;
- compensação adicional manual;
- limite potencial de não tributação da compensação segundo CIRS art. 2.º n.º 4;
- retenção na fonte segundo tabelas 2026 do Continente (Tabelas I–III, trabalhador sem deficiência);
- contribuição do trabalhador para Segurança Social por rubrica;
- total bruto, IRS, Segurança Social e líquido.

## Princípio de arquitetura

Todo o cálculo está em `app.js`. Nenhum dado sai do browser. Para uma versão seguinte, recomenda-se separar `app.js` em módulos `legal/2026/irs.js`, `legal/compensation.js`, `legal/training.js` e `legal/social-security.js`, mantendo o site 100% client-side.

## Fontes jurídicas / oficiais usadas

- Despacho n.º 233-A/2026 — tabelas de retenção na fonte 2026 (Continente): https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Despacho-233-A-2026.pdf
- Código do Trabalho (texto consolidado): https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475
- Lei n.º 69/2013, de 30 de agosto — regime transitório de compensação: https://diariodarepublica.pt/dr/detalhe/lei/69-2013-499541
- Lei n.º 13/2023, de 3 de abril — alteração do art. 366.º para 14 dias/ano: https://diariodarepublica.pt/dr/detalhe/lei/13-2023-211340863
- Código dos Regimes Contributivos, arts. 46.º e 48.º: https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575
- CIRS, art. 2.º n.º 4 — tributação de valores de cessação: https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/ra/Pages/irs2ra_202412.aspx
- TCAS, processo 723/19.0BELRA, 26-09-2024 — créditos de formação na cessação e Segurança Social: https://diariodarepublica.pt/dr/detalhe/acordao/723-2024-930517575
- Simulador ACT — compensação: https://portal.act.gov.pt/Pages/SimuladorCompensacaoCessacaoContratoTrabalho.aspx
- Simulador ACT — créditos de formação: https://portal.act.gov.pt/Pages/SimuladorDeCreditosDeFormacao.aspx

## Limitações importantes

Esta é uma ferramenta de simulação e reconciliação, não um parecer jurídico/fiscal. Contratos anteriores a 2013, instrumentos de regulamentação coletiva, regimes especiais, deficiência, Madeira/Açores e algumas modalidades de cessação exigem regras adicionais. A aplicação permite substituir manualmente a compensação para a comparar com o resultado oficial da ACT.


## Alterações v4

- Férias vencidas e proporcionais calculadas a partir das datas do contrato.
- Campo de férias gozadas no ano da cessação.
- Aplicação do limite especial do artigo 245.º, n.º 3, com campo adicional quando necessário.
- Três regimes de subsídios: 100% integral, 50% duodécimos + 50% integral, e 100% duodécimos.
- Os duodécimos são tratados como pagamentos já efetuados e abatidos aos direitos totais no fecho.
- Subsídio de Natal proporcional calculado diretamente pelo tempo de serviço no ano da cessação.

## v5 — compatibilidade ACT (sem duodécimos)

No modo "subsídios pagos por inteiro", os proporcionais de férias, subsídio de férias e subsídio de Natal usam a convenção observada no simulador ACT: duração civil em meses + dias, com a fórmula `meses/12 + dias/365`.

Caso de regressão usado:
- contrato a termo certo: 01/09/2022 a 24/12/2024
- remuneração base: 1 650 €
- férias gozadas: 14 dias
- subsídio de férias já recebido: 1 650 €
- resultado ACT: férias em falta 600,00 €; proporcionais 1 620,99 € (cada); total 5 462,98 €.

O valor/hora da formação é calculado automaticamente por `remuneração mensal bruta × 12 / (52 × período normal de trabalho semanal)`.
