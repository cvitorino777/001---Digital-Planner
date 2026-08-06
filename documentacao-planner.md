# Planner Digital — Código organizado

> Todo o código do projeto, separado por arquivo, com explicação do que cada trecho faz.

---

## Estrutura de arquivos

```
DIGITAL PLANNER/
├── index.html          (tela inicial / splash)
├── script.js            (lógica da tela inicial)
├── style.css             (estilo compartilhado + tela inicial)
├── planejamento.html    (página principal do planner)
├── planejamento.css      (estilo da página de planejamento)
└── planejamento.js        (toda a lógica do planner)
```

---

# 1. `index.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Planner - Início</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main class="tela-inicial">
      <h1 class="frase">Seja você, organizado.</h1>
      <button class="botao-comecar">Começar</button>
    </main>
    <script src="script.js"></script>
  </body>
</html>
```

**O que faz:** é a primeira tela que abre. Mostra a frase de efeito e o botão "Começar". `<link>` conecta o CSS; `<script>` conecta o JS que faz o botão funcionar.

---

# 2. `script.js`

```javascript
const botao = document.querySelector(".botao-comecar");

botao.addEventListener("click", () => {
  window.location.href = "planejamento.html";
});
```

**O que faz:** procura o botão "Começar" na página e escuta cliques nele. Quando clicado, redireciona pro `planejamento.html`.

---

# 3. `style.css`

```css
:root {
  --cor-fundo: #190019;
  --cor-superficie: #2b124c;
  --cor-superficie-clara: #522b5b;
  --cor-texto-suave: #c9a8c4;
  --cor-destaque: #dfb6b2;
  --cor-texto-claro: #fbe4d8;
}
```

**O que faz:** define as **cores da paleta como variáveis reutilizáveis** (`--cor-fundo`, etc). Em vez de escrever `#190019` toda hora, uso `var(--cor-fundo)` — se um dia quiser trocar a paleta inteira, mudo só aqui.

```css
.tela-inicial {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background-color: var(--cor-fundo);
  text-align: center;
}
```

**O que faz:** centraliza a frase e o botão no meio da tela (flexbox), ocupando 100% da altura da janela.

```css
.botao-comecar {
  padding: 12px 32px;
  border: 1px solid var(--cor-superficie-clara);
  border-radius: 8px;
  background-color: var(--cor-superficie);
  color: var(--cor-texto-claro);
  cursor: pointer;
}
```

**O que faz:** estiliza o botão — cantos arredondados, cores da paleta, cursor de "mão" ao passar o mouse.

---

# 4. `planejamento.html`

## 4.1 Estrutura geral (sidebar + conteúdo)

```html
<div class="layout-app">
  <aside class="sidebar">...</aside>
  <main class="conteudo-principal">...</main>
</div>
```

**O que faz:** divide a página em duas colunas lado a lado — a `sidebar` (menu fixo à esquerda) e o `conteudo-principal` (tudo mais). Isso é resolvido no CSS com `display: flex`.

## 4.2 Sidebar — marca e perfil

```html
<div class="marca-sidebar">
  <span class="marca-logo">P</span>
  <span class="marca-nome">Meu Planner</span>
</div>

<div class="perfil-sidebar">
  <div class="avatar-placeholder">C</div>
  <div class="perfil-info">
    <span class="perfil-nome">Cesar</span>
    <span class="perfil-sub">ProdC$R</span>
  </div>
</div>
```

**O que faz:** topo da sidebar — um "logo" simples (letra P num quadrado) e um cartão de perfil (inicial "C" + nome). São só elementos visuais por enquanto, sem lógica.

## 4.3 Sidebar — navegação (categorias)

```html
<nav class="nav-sidebar">
  <button class="nav-item ativo" data-categoria="daily">Daily</button>
  <button class="nav-item" data-categoria="planners">Planners</button>
  <button class="nav-item" data-categoria="pessoal">Pessoal</button>
  <button class="nav-item" data-categoria="metas">Metas</button>
</nav>
```

**O que faz:** os 4 botões de categoria. `data-categoria` guarda um identificador que o JS usa depois. A classe `ativo` marca visualmente qual está selecionado.

## 4.4 Contadores

```html
<div class="barra-contadores">
  <div class="contador">
    <span class="numero" id="numero-pendentes">0</span>
    <span class="rotulo">Pendentes</span>
  </div>
  <!-- + Hoje, + Concluídos -->
</div>
```

**O que faz:** mostra os 3 números (Pendentes/Hoje/Concluídos). Os `id`s (`numero-pendentes`, etc) são os "ganchos" que o JavaScript usa pra atualizar o número exibido.

## 4.5 Legenda de categorias de evento

```html
<div class="legenda-categorias">
  <span class="item-legenda"><i style="background:#378ADD"></i>Trabalho</span>
  <!-- + Faculdade, Música, Pessoal, Outro -->
</div>
```

**O que faz:** mostra uma bolinha colorida + nome pra cada categoria de evento (diferente das categorias da sidebar — essas são sobre o *tipo do evento em si*, tipo "Trabalho" ou "Música").

## 4.6 Barra de navegação de período

```html
<div class="barra-visualizacao">
  <div class="navegacao">
    <button id="botao-anterior">‹</button>
    <button id="botao-hoje">Hoje</button>
    <button id="botao-proximo">›</button>
  </div>
  <h2 id="titulo-periodo"></h2>
  <div class="seletor-visualizacao" id="seletor-visualizacao">
    <button data-visao="dia">Dia</button>
    <button data-visao="semana" class="ativo">Semana</button>
    <button data-visao="mes">Mês</button>
    <button data-visao="ano">Ano</button>
  </div>
</div>
```

**O que faz:** os botões `‹` `›` andam pro período anterior/próximo; "Hoje" volta pra data atual; `#titulo-periodo` é preenchido pelo JS com o texto do período (ex: "Agosto de 2026"); os 4 botões de baixo trocam entre as visões Dia/Semana/Mês/Ano.

## 4.7 Áreas de conteúdo (grid, mês, ano)

```html
<div class="grid-wrapper" id="area-grid">
  <table class="grid-semana" id="grid-semana">
    <thead>
      <tr id="linha-dias">
        <th class="coluna-hora"></th>
      </tr>
    </thead>
    <tbody id="corpo-grid"></tbody>
  </table>
</div>

<div class="area-mes oculto" id="area-mes"></div>
<div class="area-ano oculto" id="area-ano"></div>
```

**O que faz:** são os **3 "containers" vazios** que o JavaScript preenche dinamicamente, dependendo de qual visão está ativa. Repara que `area-mes` e `area-ano` começam com a classe `oculto` (escondidos) — só um fica visível por vez.

## 4.8 Barra flutuante de ações

```html
<div class="barra-flutuante" id="barra-flutuante">
  <button id="botao-concluir">Concluir</button>
  <button id="botao-copiar">Copiar</button>
  <button id="botao-excluir">Excluir</button>
</div>
```

**O que faz:** menu que aparece flutuando perto de um evento clicado, com as ações possíveis.

---

# 5. `planejamento.css`

## 5.1 Paleta e layout base

```css
:root {
  --cor-fundo: #190019;
  --cor-superficie: #2b124c;
  --cor-superficie-clara: #522b5b;
  --cor-texto-suave: #c9a8c4;
  --cor-destaque: #dfb6b2;
  --cor-texto-claro: #fbe4d8;
}

.layout-app {
  display: flex;
  min-height: 100vh;
}
```

**O que faz:** repete as mesmas variáveis de cor do `style.css` (cada arquivo CSS tem seu próprio escopo, por isso duplico aqui). `display: flex` no `.layout-app` é o que coloca sidebar e conteúdo lado a lado.

## 5.2 Sidebar

```css
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background-color: var(--cor-superficie);
  border-right: 1px solid var(--cor-superficie-clara);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
```

**O que faz:** largura fixa de 220px; `flex-shrink: 0` impede que ela "encolha" quando a tela é pequena; `flex-direction: column` empilha os elementos internos (marca, perfil, nav) de cima pra baixo.

```css
.nav-item.ativo {
  background-color: var(--cor-destaque);
  color: var(--cor-fundo);
  font-weight: 600;
}
```

**O que faz:** estilo do botão de categoria quando está selecionado — fundo na cor de destaque, texto escuro (pra manter contraste).

## 5.3 Grid (dia/semana)

```css
.slot {
  cursor: pointer;
  transition: background-color 0.1s;
}

.slot.evento {
  color: #190019;
  font-size: 0.75rem;
  font-weight: bold;
}

.slot.evento.concluido {
  opacity: 0.55;
  text-decoration: line-through;
}
```

**O que faz:** `.slot` é toda célula clicável do grid. `.evento` é aplicado quando a célula tem um evento (o JS adiciona essa classe). `.concluido` deixa a célula "apagada" e riscada — usado quando o evento é marcado como feito.

## 5.4 Visão mês

```css
.grade-mes {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.dia-mes.hoje {
  border: 2px solid var(--cor-destaque);
}
```

**O que faz:** `grid-template-columns: repeat(7, 1fr)` cria 7 colunas de largura igual (uma pra cada dia da semana) — isso é o **CSS Grid**, um sistema de layout diferente do flexbox, melhor pra criar "tabelas" visuais. `.hoje` destaca com borda o dia atual.

## 5.5 Visão ano

```css
.grade-ano {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
```

**O que faz:** mesma ideia do grid do mês, só que com 4 colunas (formando 3 linhas de 4 meses = 12 cards).

---

# 6. `planejamento.js`

## 6.1 Configuração geral

```javascript
const HORAS = ["1AM", "2AM", ..., "11PM"];
const NOMES_DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOMES_MES = ["Janeiro", "Fevereiro", ...];
const CHAVE_STORAGE = "planner-eventos-todos";
```

**O que faz:** listas fixas usadas em vários lugares do código — evita repetir os nomes dos dias/meses toda vez que preciso deles.

## 6.2 Categorias de evento

```javascript
const CATEGORIAS = {
  1: { id: "trabalho", nome: "Trabalho", cor: "#378ADD" },
  // ...
};

function perguntarCategoria() {
  const opcoes = Object.entries(CATEGORIAS)
    .map(([numero, cat]) => `${numero} - ${cat.nome}`)
    .join("\n");
  const escolha = prompt(`Categoria:\n${opcoes}`, "1");
  return CATEGORIAS[escolha] || CATEGORIAS[5];
}
```

**O que faz:** guarda as 5 categorias fixas (id, nome, cor). `perguntarCategoria()` monta a lista numerada, mostra num `prompt()`, e devolve a categoria escolhida (ou "Outro" se digitar algo inválido).

## 6.3 Utilidades de data

```javascript
function formatarISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function obterInicioSemana(data) {
  const copia = normalizarData(data);
  copia.setDate(copia.getDate() - copia.getDay());
  return copia;
}
```

**O que faz:** `formatarISO` transforma uma data em texto no formato `"2026-08-01"` — é a "chave" usada pra guardar eventos. `obterInicioSemana` calcula o domingo daquela semana (base pra visão "Semana").

## 6.4 Estado em memória

```javascript
let eventos = carregarEventos();
let visualizacao = "semana"; // dia | semana | mes | ano
let dataReferencia = normalizarData(new Date());
```

**O que faz:** as 3 variáveis mais importantes do programa. `eventos` guarda todos os eventos; `visualizacao` diz qual tela está ativa; `dataReferencia` é "onde" você está navegando (muda quando clica em ‹ › ou num dia do calendário).

## 6.5 Armazenamento local (localStorage)

```javascript
function carregarEventos() {
  const salvo = localStorage.getItem(CHAVE_STORAGE);
  return salvo ? JSON.parse(salvo) : {};
}

function salvarEventos() {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(eventos));
}
```

**O que faz:** `localStorage` é a "memória permanente" do navegador — funciona parecido com o `tarefas.json` do seu projeto em Python, só que quem guarda é o próprio navegador em vez de um arquivo.

## 6.6 Criar evento

```javascript
function criarEvento(data, horaInicio, tamanho, texto, categoria, feitaForcada) {
  const iso = formatarISO(data);
  const grupoId = `${iso}-${horaInicio}-${Date.now()}`;
  const cat = categoria || CATEGORIAS[5];

  for (let i = 0; i < tamanho; i++) {
    const chave = `${iso}-${horaInicio + i}`;
    eventos[chave] = { texto, categoriaId: cat.id, cor: cat.cor, grupoId, primeira: i === 0, feita: feitaForcada || false };
  }

  salvarEventos();
  atualizarVisualizacao();
}
```

**O que faz:** cria um evento que pode ocupar várias horas. O `for` percorre cada hora do intervalo e salva uma entrada no objeto `eventos` pra cada uma — todas compartilham o mesmo `grupoId`, o que permite tratar o bloco inteiro como "um evento só" depois (pra copiar, excluir, concluir).

## 6.7 Visão grid (dia e semana)

```javascript
function diasDoGrid() {
  if (visualizacao === "dia") return [dataReferencia];
  const inicio = obterInicioSemana(dataReferencia);
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}
```

**O que faz:** decide quais dias mostrar no grid — um dia só (visão "Dia") ou os 7 dias da semana (visão "Semana"). O resto do grid (`montarCabecalhoGrid`, `montarCorpoGrid`, `renderizarEventosNoGrid`) usa essa lista pra desenhar as colunas.

```javascript
function iniciarSelecao(celula) { ... }
function estenderSelecao(celula) { ... }
function finalizarSelecao() {
  const texto = prompt("Nome do evento:");
  if (texto && texto.trim()) {
    const categoria = perguntarCategoria();
    criarEvento(...);
  }
}
```

**O que faz:** essas 3 funções trabalham juntas pra implementar o "clique e arraste": `mousedown` chama `iniciarSelecao`, mover o mouse chama `estenderSelecao`, soltar o botão chama `finalizarSelecao` — que pergunta o nome e a categoria, e cria o evento.

## 6.8 Copiar / excluir / concluir

```javascript
function copiarEventoMarcado() {
  const celulasDoGrupo = Object.values(eventos).filter((e) => e.grupoId === grupoMarcado);
  areaTransferencia = { texto: ..., categoria: ..., tamanho: celulasDoGrupo.length };
}

function tentarColar(celula) {
  criarEvento(..., areaTransferencia.texto, areaTransferencia.categoria);
  areaTransferencia = null;
}
```

**O que faz:** `copiarEventoMarcado` guarda os dados do evento clicado numa variável temporária (`areaTransferencia`). `tentarColar` usa esses dados pra criar uma cópia em outra célula. É basicamente um "copiar e colar" caseiro, sem usar a área de transferência real do sistema operacional.

## 6.9 Visão mês

```javascript
function renderizarMes() {
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = somarDias(primeiroDia, -primeiroDia.getDay());

  for (let i = 0; i < 42; i++) {
    const data = somarDias(inicioGrade, i);
    // cria uma célula pra cada dia
  }
}
```

**O que faz:** monta uma grade de **42 células** (6 semanas × 7 dias) — suficiente pra cobrir qualquer mês, incluindo os dias do mês anterior/seguinte que "vazam" pra completar a grade visualmente. `contarEventosDoDia` conta quantos eventos aquele dia tem, pra mostrar o número na bolinha.

## 6.10 Visão ano

```javascript
function contarEventosDoMes(ano, mes) {
  const prefixo = `${ano}-${String(mes + 1).padStart(2, "0")}-`;
  const grupos = new Set();
  Object.entries(eventos).forEach(([chave, evento]) => {
    if (chave.startsWith(prefixo)) grupos.add(evento.grupoId);
  });
  return grupos.size;
}
```

**O que faz:** conta eventos de um mês inteiro checando se a chave do evento **começa com** o prefixo daquele mês (ex: `"2026-08-"`). Usa um `Set` (conjunto) pra não contar o mesmo evento duas vezes, já que um evento pode ocupar várias células.

## 6.11 Contadores globais

```javascript
function atualizarContadores() {
  const grupos = {};
  Object.values(eventos).forEach((evento) => (grupos[evento.grupoId] = evento));
  const listaEventos = Object.values(grupos);

  const concluidos = listaEventos.filter((e) => e.feita).length;
  const pendentes = listaEventos.length - concluidos;
  // ...
}
```

**O que faz:** conta Pendentes/Hoje/Concluídos. O truque do `grupos = {}` é o mesmo dos outros contadores — agrupa por `grupoId` primeiro, pra um evento de 3 horas contar como 1, não como 3.

## 6.12 Troca de visualização e navegação

```javascript
function navegar(direcao) {
  if (visualizacao === "dia") dataReferencia = somarDias(dataReferencia, direcao);
  else if (visualizacao === "semana") dataReferencia = somarDias(dataReferencia, direcao * 7);
  else if (visualizacao === "mes") dataReferencia = normalizarData(new Date(dataReferencia.getFullYear(), dataReferencia.getMonth() + direcao, 1));
  else dataReferencia = normalizarData(new Date(dataReferencia.getFullYear() + direcao, 0, 1));
  atualizarVisualizacao();
}
```

**O que faz:** os botões `‹` `›` chamam essa função com `direcao = -1` ou `1`. Dependendo da visão ativa, "andar" significa coisas diferentes: 1 dia, 7 dias (1 semana), 1 mês, ou 1 ano.

```javascript
function atualizarVisualizacao() {
  // esconde tudo, depois mostra só a área da visão ativa
  if (visualizacao === "dia" || visualizacao === "semana") {
    areaGrid.classList.remove("oculto");
    montarCabecalhoGrid();
    montarCorpoGrid();
    renderizarEventosNoGrid();
  } else if (visualizacao === "mes") {
    areaMes.classList.remove("oculto");
    renderizarMes();
  } else {
    areaAno.classList.remove("oculto");
    renderizarAno();
  }
  atualizarTitulo();
  atualizarContadores();
}
```

**O que faz:** é a **função "maestro"** — toda vez que algo muda (navegou, criou evento, trocou de visão), essa função roda e redesenha a tela inteira do zero, garantindo que tudo fique sincronizado.

## 6.13 Inicialização (fim do arquivo)

```javascript
configurarEventosDoGrid();
atualizarVisualizacao();

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => { ... });
});

document.getElementById("botao-anterior").addEventListener("click", () => navegar(-1));
// ...
```

**O que faz:** o código que roda assim que a página carrega — liga todos os botões aos seus respectivos comportamentos (clique, navegação, troca de categoria) e desenha a tela pela primeira vez.

