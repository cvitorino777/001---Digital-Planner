// --- Configuração geral ---
const HORAS = [
  "1AM", "2AM", "3AM", "4AM", "5AM", "6AM", "7AM", "8AM",
  "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM",
  "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM",
];
const NOMES_DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// --- Categorias (padrão + personalizadas) ---
const CATEGORIAS_PADRAO = [
  { id: "trabalho", nome: "Trabalho", cor: "#378ADD" },
  { id: "faculdade", nome: "Faculdade", cor: "#7F77DD" },
  { id: "musica", nome: "Música", cor: "#D4537E" },
  { id: "pessoal", nome: "Pessoal", cor: "#639922" },
  { id: "outro", nome: "Outro", cor: "#D85A30" },
];

function carregarCategorias() {
  const salvo = localStorage.getItem("planner-categorias");
  if (salvo) return JSON.parse(salvo);
  localStorage.setItem("planner-categorias", JSON.stringify(CATEGORIAS_PADRAO));
  return [...CATEGORIAS_PADRAO];
}

function salvarCategorias() {
  localStorage.setItem("planner-categorias", JSON.stringify(categorias));
}

function obterCategoria(id) {
  return categorias.find((c) => c.id === id) || categorias[categorias.length - 1];
}

// --- Prioridades fixas ---
const PRIORIDADES = [
  { id: "urgente", nome: "Urgente", cor: "#e5484d", emoji: "🔴" },
  { id: "alta", nome: "Alta", cor: "#f5a623", emoji: "🟠" },
  { id: "media", nome: "Média", cor: "#e8d84a", emoji: "🟡" },
  { id: "baixa", nome: "Baixa", cor: "#4caf50", emoji: "🟢" },
];

function obterPrioridade(id) {
  return PRIORIDADES.find((p) => p.id === id) || null;
}

// --- Utilidades de data ---
function normalizarData(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function formatarISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function somarDias(data, quantidade) {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + quantidade);
  return copia;
}

function obterInicioSemana(data) {
  const copia = normalizarData(data);
  copia.setDate(copia.getDate() - copia.getDay());
  return copia;
}

function mesmaData(a, b) {
  return formatarISO(a) === formatarISO(b);
}

// --- Planners (listas separadas de eventos) ---
function carregarListaPlanners() {
  const salvo = localStorage.getItem("planner-lista");
  if (salvo) return JSON.parse(salvo);
  const padrao = [{ id: "daily", nome: "Daily" }];
  localStorage.setItem("planner-lista", JSON.stringify(padrao));
  return padrao;
}

function salvarListaPlanners() {
  localStorage.setItem("planner-lista", JSON.stringify(listaPlanners));
}

function chaveEventosDoPlanner(id) {
  return `planner-eventos-${id}`;
}

function migrarEventosAntigos() {
  const antigos = localStorage.getItem("planner-eventos-todos");
  const chaveDaily = chaveEventosDoPlanner("daily");
  if (antigos && !localStorage.getItem(chaveDaily)) {
    localStorage.setItem(chaveDaily, antigos);
  }
}

// --- Estado em memória ---
let listaPlanners = carregarListaPlanners();
migrarEventosAntigos();
let plannerAtivoId = localStorage.getItem("planner-ativo") || listaPlanners[0].id;
let categorias = carregarCategorias();
let eventos = carregarEventos(); // { "2026-08-01-3": { texto, categoriaId, cor, grupoId, primeira, feita, prioridadeId, serieId }, ... }
let visualizacao = "semana"; // dia | semana | mes | ano
let dataReferencia = normalizarData(new Date());

let selecionando = false;
let dataSelecao = null;
let inicioSelecao = null;
let fimSelecao = null;
let grupoMarcado = null;
let areaTransferencia = null;
let selecaoPendente = null;
let categoriaSelecionadaId = categorias[0].id;
let prioridadeSelecionadaId = null;

// --- Armazenamento local ---
function carregarEventos() {
  const salvo = localStorage.getItem(chaveEventosDoPlanner(plannerAtivoId));
  return salvo ? JSON.parse(salvo) : {};
}

function salvarEventos() {
  localStorage.setItem(chaveEventosDoPlanner(plannerAtivoId), JSON.stringify(eventos));
}

// --- Criar / colar evento ---
function criarEvento(data, horaInicio, tamanho, texto, categoria, feitaForcada, prioridadeId, serieId) {
  const iso = formatarISO(data);
  const grupoId = `${iso}-${horaInicio}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const cat = categoria || categorias[categorias.length - 1];

  for (let i = 0; i < tamanho; i++) {
    const chave = `${iso}-${horaInicio + i}`;
    eventos[chave] = {
      texto,
      categoriaId: cat.id,
      cor: cat.cor,
      grupoId,
      primeira: i === 0,
      feita: feitaForcada || false,
      prioridadeId: prioridadeId || null,
      serieId: serieId || null,
    };
  }

  salvarEventos();
  atualizarVisualizacao();
}

// --- Recorrência ---
function gerarDatasRecorrencia(dataBase, tipo, diasSemana, quantidade) {
  if (tipo === "nenhuma" || quantidade < 1) return [dataBase];

  if (tipo === "diaria") {
    return Array.from({ length: quantidade }, (_, i) => somarDias(dataBase, i));
  }

  if (tipo === "semanal") {
    return Array.from({ length: quantidade }, (_, i) => somarDias(dataBase, i * 7));
  }

  if (tipo === "mensal") {
    return Array.from({ length: quantidade }, (_, i) => {
      const proxima = new Date(dataBase);
      proxima.setMonth(proxima.getMonth() + i);
      return normalizarData(proxima);
    });
  }

  if (tipo === "dias-especificos" && diasSemana.length > 0) {
    const datas = [];
    let cursor = normalizarData(dataBase);
    let seguranca = 0;
    while (datas.length < quantidade && seguranca < 400) {
      if (diasSemana.includes(cursor.getDay())) datas.push(new Date(cursor));
      cursor = somarDias(cursor, 1);
      seguranca++;
    }
    return datas;
  }

  return [dataBase];
}

// ==================================================
// VISÃO GRID (usada tanto para "dia" quanto "semana")
// ==================================================
function diasDoGrid() {
  if (visualizacao === "dia") return [dataReferencia];
  const inicio = obterInicioSemana(dataReferencia);
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

function montarCabecalhoGrid() {
  const linha = document.getElementById("linha-dias");
  linha.querySelectorAll("th[data-date]").forEach((th) => th.remove());

  diasDoGrid().forEach((data) => {
    const th = document.createElement("th");
    th.dataset.date = formatarISO(data);
    th.textContent = `${NOMES_DIA_CURTO[data.getDay()]} ${data.getDate()}`;
    if (mesmaData(data, new Date())) th.classList.add("coluna-hoje");
    linha.appendChild(th);
  });
}

function montarCorpoGrid() {
  const corpo = document.getElementById("corpo-grid");
  corpo.innerHTML = "";
  const dias = diasDoGrid();

  HORAS.forEach((hora, indiceHora) => {
    const linha = document.createElement("tr");

    const celulaHora = document.createElement("td");
    celulaHora.textContent = hora;
    celulaHora.className = "celula-hora";
    linha.appendChild(celulaHora);

    dias.forEach((data) => {
      const celula = document.createElement("td");
      celula.className = "slot";
      celula.dataset.date = formatarISO(data);
      celula.dataset.hora = indiceHora;
      linha.appendChild(celula);
    });

    corpo.appendChild(linha);
  });
}

function renderizarEventosNoGrid() {
  document.querySelectorAll(".slot").forEach((celula) => {
    const chave = `${celula.dataset.date}-${celula.dataset.hora}`;
    const evento = eventos[chave];

    celula.classList.remove("evento", "marcado", "concluido");
    celula.style.removeProperty("--cor-evento");
    celula.textContent = "";

    if (evento) {
      celula.classList.add("evento");
      if (evento.feita) celula.classList.add("concluido");
      celula.style.setProperty("--cor-evento", evento.cor);
      if (evento.grupoId === grupoMarcado) celula.classList.add("marcado");
      if (evento.primeira) {
        const prioridade = evento.prioridadeId ? obterPrioridade(evento.prioridadeId) : null;
        celula.textContent = prioridade ? `${prioridade.emoji} ${evento.texto}` : evento.texto;
      }
    }
  });
}

function iniciarSelecao(celula) {
  if (celula.classList.contains("evento")) return;
  selecionando = true;
  dataSelecao = celula.dataset.date;
  inicioSelecao = Number(celula.dataset.hora);
  fimSelecao = inicioSelecao;
  destacarSelecao();
}

function estenderSelecao(celula) {
  if (!selecionando || celula.dataset.date !== dataSelecao) return;
  fimSelecao = Number(celula.dataset.hora);
  destacarSelecao();
}

function destacarSelecao() {
  const [de, ate] = [inicioSelecao, fimSelecao].sort((a, b) => a - b);
  document.querySelectorAll(".slot").forEach((celula) => {
    const dentro =
      celula.dataset.date === dataSelecao &&
      Number(celula.dataset.hora) >= de &&
      Number(celula.dataset.hora) <= ate;
    celula.classList.toggle("selecionando", dentro);
  });
}

function finalizarSelecao() {
  if (!selecionando) return;
  selecionando = false;

  const [de, ate] = [inicioSelecao, fimSelecao].sort((a, b) => a - b);
  const celulaFinal = document.querySelector(
    `.slot[data-date="${dataSelecao}"][data-hora="${ate}"]`
  );

  selecaoPendente = { dataSelecao, de, ate };
  abrirModalEvento(celulaFinal);
}

// --- Modal: categorias ---
function montarOpcoesCategoria() {
  const container = document.getElementById("opcoes-categoria");
  container.innerHTML = "";

  categorias.forEach((cat) => {
    const opcao = document.createElement("button");
    opcao.type = "button";
    opcao.className = "opcao-categoria" + (cat.id === categoriaSelecionadaId ? " selecionada" : "");
    opcao.dataset.id = cat.id;
    opcao.innerHTML = `<i style="background:${cat.cor}"></i>${cat.nome}`;
    opcao.addEventListener("click", () => {
      categoriaSelecionadaId = cat.id;
      montarOpcoesCategoria();
    });
    container.appendChild(opcao);
  });

  const botaoNova = document.createElement("button");
  botaoNova.type = "button";
  botaoNova.className = "opcao-categoria opcao-nova-categoria";
  botaoNova.textContent = "+ Nova";
  botaoNova.addEventListener("click", abrirFormNovaCategoria);
  container.appendChild(botaoNova);
}

function abrirFormNovaCategoria() {
  document.getElementById("form-nova-categoria").classList.remove("oculto");
  document.getElementById("input-nome-categoria").focus();
}

function fecharFormNovaCategoria() {
  document.getElementById("form-nova-categoria").classList.add("oculto");
  document.getElementById("input-nome-categoria").value = "";
}

function confirmarNovaCategoria() {
  const nome = document.getElementById("input-nome-categoria").value.trim();
  const cor = document.getElementById("input-cor-categoria").value;
  if (!nome) return;

  const id = `${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  categorias.push({ id, nome, cor });
  salvarCategorias();
  categoriaSelecionadaId = id;

  fecharFormNovaCategoria();
  montarOpcoesCategoria();
  renderizarLegendaCategorias();
}

// --- Modal: prioridades ---
function montarOpcoesPrioridade() {
  const container = document.getElementById("opcoes-prioridade");
  container.innerHTML = "";

  const opcaoNenhuma = document.createElement("button");
  opcaoNenhuma.type = "button";
  opcaoNenhuma.className = "opcao-prioridade" + (prioridadeSelecionadaId === null ? " selecionada" : "");
  opcaoNenhuma.textContent = "Sem prioridade";
  opcaoNenhuma.addEventListener("click", () => {
    prioridadeSelecionadaId = null;
    montarOpcoesPrioridade();
  });
  container.appendChild(opcaoNenhuma);

  PRIORIDADES.forEach((p) => {
    const opcao = document.createElement("button");
    opcao.type = "button";
    opcao.className = "opcao-prioridade" + (p.id === prioridadeSelecionadaId ? " selecionada" : "");
    opcao.innerHTML = `${p.emoji} ${p.nome}`;
    opcao.addEventListener("click", () => {
      prioridadeSelecionadaId = p.id;
      montarOpcoesPrioridade();
    });
    container.appendChild(opcao);
  });
}

// --- Modal: recorrência ---
function resetarRecorrencia() {
  document.getElementById("select-recorrencia").value = "nenhuma";
  document.getElementById("input-repeticoes").value = 8;
  document.querySelectorAll(".dia-semana-opcao").forEach((el) => el.classList.remove("selecionado"));
  document.getElementById("container-dias-semana").classList.add("oculto");
  document.getElementById("container-repeticoes").classList.add("oculto");
}

function abrirModalEvento(celulaReferencia) {
  const modal = document.getElementById("modal-evento");
  const input = document.getElementById("input-nome-evento");

  categoriaSelecionadaId = categorias[0].id;
  prioridadeSelecionadaId = null;
  montarOpcoesCategoria();
  montarOpcoesPrioridade();
  fecharFormNovaCategoria();
  resetarRecorrencia();
  modal.classList.remove("oculto");

  const posicao = celulaReferencia.getBoundingClientRect();
  const espacoAbaixo = window.innerHeight - posicao.bottom;
  if (espacoAbaixo > 380) {
    modal.style.top = `${posicao.bottom + 6}px`;
  } else {
    modal.style.top = `${Math.max(10, posicao.top - 390)}px`;
  }
  let esquerda = posicao.left;
  if (esquerda + 260 > window.innerWidth) esquerda = window.innerWidth - 266;
  modal.style.left = `${esquerda}px`;

  input.value = "";
  input.focus();
}

function fecharModalEvento() {
  document.getElementById("modal-evento").classList.add("oculto");
  document.querySelectorAll(".slot.selecionando").forEach((c) => c.classList.remove("selecionando"));
  selecaoPendente = null;
}

function confirmarCriacaoEvento() {
  if (!selecaoPendente) return;
  const texto = document.getElementById("input-nome-evento").value.trim();
  if (!texto) return;

  const { dataSelecao, de, ate } = selecaoPendente;
  const [ano, mes, dia] = dataSelecao.split("-").map(Number);
  const dataBase = new Date(ano, mes - 1, dia);
  const categoria = obterCategoria(categoriaSelecionadaId);

  const tipoRecorrencia = document.getElementById("select-recorrencia").value;
  const quantidade = Math.max(1, Number(document.getElementById("input-repeticoes").value) || 1);
  const diasSemana = Array.from(document.querySelectorAll(".dia-semana-opcao.selecionado")).map((el) => Number(el.dataset.dia));

  const datas = gerarDatasRecorrencia(dataBase, tipoRecorrencia, diasSemana, quantidade);
  const serieId = datas.length > 1 ? `serie-${Date.now()}` : null;

  datas.forEach((data) => {
    criarEvento(data, de, ate - de + 1, texto, categoria, false, prioridadeSelecionadaId, serieId);
  });

  fecharModalEvento();
}

function marcarEvento(celula) {
  const chave = `${celula.dataset.date}-${celula.dataset.hora}`;
  const evento = eventos[chave];
  if (!evento) {
    grupoMarcado = null;
    esconderBarra();
    renderizarEventosNoGrid();
    return;
  }
  grupoMarcado = evento.grupoId;
  renderizarEventosNoGrid();
  mostrarBarra(celula);
}

function mostrarBarra(celula) {
  const barra = document.getElementById("barra-flutuante");
  const posicao = celula.getBoundingClientRect();
  barra.style.left = `${posicao.left}px`;
  barra.style.top = `${posicao.top - 44}px`;
  barra.classList.add("visivel");
}

function esconderBarra() {
  document.getElementById("barra-flutuante").classList.remove("visivel");
}

function copiarEventoMarcado() {
  if (!grupoMarcado) return;
  const celulasDoGrupo = Object.values(eventos).filter((e) => e.grupoId === grupoMarcado);
  areaTransferencia = {
    texto: celulasDoGrupo[0].texto,
    categoria: { id: celulasDoGrupo[0].categoriaId, cor: celulasDoGrupo[0].cor },
    prioridadeId: celulasDoGrupo[0].prioridadeId || null,
    tamanho: celulasDoGrupo.length,
  };
  alert("Evento copiado! Clique numa célula vazia pra colar.");
  esconderBarra();
}

function excluirEventoMarcado() {
  if (!grupoMarcado) return;
  Object.keys(eventos).forEach((chave) => {
    if (eventos[chave].grupoId === grupoMarcado) delete eventos[chave];
  });
  grupoMarcado = null;
  salvarEventos();
  atualizarVisualizacao();
  esconderBarra();
}

function alternarConclusaoMarcado() {
  if (!grupoMarcado) return;
  const novoEstado = !Object.values(eventos).find((e) => e.grupoId === grupoMarcado).feita;
  Object.keys(eventos).forEach((chave) => {
    if (eventos[chave].grupoId === grupoMarcado) eventos[chave].feita = novoEstado;
  });
  salvarEventos();
  atualizarVisualizacao();
  esconderBarra();
}

function tentarColar(celula) {
  if (!areaTransferencia || celula.classList.contains("evento")) return false;
  const [ano, mes, dia] = celula.dataset.date.split("-").map(Number);
  const horaInicio = Number(celula.dataset.hora);
  criarEvento(new Date(ano, mes - 1, dia), horaInicio, areaTransferencia.tamanho, areaTransferencia.texto, areaTransferencia.categoria, false, areaTransferencia.prioridadeId, null);
  areaTransferencia = null;
  return true;
}

function configurarEventosDoGrid() {
  const corpo = document.getElementById("corpo-grid");

  corpo.addEventListener("mousedown", (ev) => {
    const celula = ev.target.closest(".slot");
    if (!celula) return;

    if (celula.classList.contains("evento")) {
      marcarEvento(celula);
      return;
    }
    if (areaTransferencia) {
      tentarColar(celula);
      return;
    }
    iniciarSelecao(celula);
  });

  corpo.addEventListener("mouseover", (ev) => {
    const celula = ev.target.closest(".slot");
    if (celula) estenderSelecao(celula);
  });

  document.addEventListener("mouseup", finalizarSelecao);
}

// ==================================================
// VISÃO MÊS
// ==================================================
function contarEventosDoDia(data) {
  const iso = formatarISO(data);
  const grupos = new Set();
  Object.entries(eventos).forEach(([chave, evento]) => {
    if (chave.startsWith(`${iso}-`)) grupos.add(evento.grupoId);
  });
  return grupos.size;
}

function renderizarMes() {
  const area = document.getElementById("area-mes");
  area.innerHTML = "";

  const grade = document.createElement("div");
  grade.className = "grade-mes";

  NOMES_DIA_CURTO.forEach((nome) => {
    const rotulo = document.createElement("div");
    rotulo.className = "rotulo-dia-semana";
    rotulo.textContent = nome;
    grade.appendChild(rotulo);
  });

  const ano = dataReferencia.getFullYear();
  const mes = dataReferencia.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = somarDias(primeiroDia, -primeiroDia.getDay());

  for (let i = 0; i < 42; i++) {
    const data = somarDias(inicioGrade, i);
    const celula = document.createElement("div");
    celula.className = "dia-mes";
    if (data.getMonth() !== mes) celula.classList.add("fora-do-mes");
    if (mesmaData(data, new Date())) celula.classList.add("hoje");

    const numero = document.createElement("div");
    numero.className = "numero-dia";
    numero.textContent = data.getDate();
    celula.appendChild(numero);

    const total = contarEventosDoDia(data);
    if (total > 0) {
      const badge = document.createElement("span");
      badge.className = "badge-eventos";
      badge.textContent = total;
      celula.appendChild(badge);
    }

    celula.addEventListener("click", () => {
      dataReferencia = normalizarData(data);
      mudarVisualizacao("dia");
    });

    grade.appendChild(celula);
  }

  area.appendChild(grade);
}

// ==================================================
// VISÃO ANO
// ==================================================
function contarEventosDoMes(ano, mes) {
  const prefixo = `${ano}-${String(mes + 1).padStart(2, "0")}-`;
  const grupos = new Set();
  Object.entries(eventos).forEach(([chave, evento]) => {
    if (chave.startsWith(prefixo)) grupos.add(evento.grupoId);
  });
  return grupos.size;
}

function renderizarAno() {
  const area = document.getElementById("area-ano");
  area.innerHTML = "";

  const grade = document.createElement("div");
  grade.className = "grade-ano";
  const ano = dataReferencia.getFullYear();
  const hoje = new Date();

  NOMES_MES.forEach((nome, indiceMes) => {
    const card = document.createElement("div");
    card.className = "mes-card";
    if (ano === hoje.getFullYear() && indiceMes === hoje.getMonth()) card.classList.add("mes-atual");

    const titulo = document.createElement("div");
    titulo.className = "nome-mes";
    titulo.textContent = nome;
    card.appendChild(titulo);

    const total = contarEventosDoMes(ano, indiceMes);
    const contagem = document.createElement("div");
    contagem.className = "contagem-mes";
    contagem.textContent = total > 0 ? `${total} evento(s)` : "sem eventos";
    card.appendChild(contagem);

    card.addEventListener("click", () => {
      dataReferencia = normalizarData(new Date(ano, indiceMes, 1));
      mudarVisualizacao("mes");
    });

    grade.appendChild(card);
  });

  area.appendChild(grade);
}

// ==================================================
// CONTADORES GLOBAIS (Pendentes / Hoje / Concluídos)
// ==================================================
function atualizarContadores() {
  const grupos = {};
  Object.values(eventos).forEach((evento) => (grupos[evento.grupoId] = evento));
  const listaEventos = Object.values(grupos);

  const concluidos = listaEventos.filter((e) => e.feita).length;
  const pendentes = listaEventos.length - concluidos;
  const isoHoje = formatarISO(new Date());
  const hoje = Object.keys(eventos).filter((chave) => chave.startsWith(`${isoHoje}-`));
  const hojeUnicos = new Set(hoje.map((chave) => eventos[chave].grupoId)).size;

  document.getElementById("numero-pendentes").textContent = pendentes;
  document.getElementById("numero-hoje").textContent = hojeUnicos;
  document.getElementById("numero-concluidos").textContent = concluidos;
}

// ==================================================
// PAINEL DE HOJE (próximos eventos + progresso do dia)
// ==================================================
function obterEventosAgrupados() {
  const grupos = {};
  Object.entries(eventos).forEach(([chave, evento]) => {
    if (!evento.primeira) return;
    const [ano, mes, dia, hora] = chave.split("-").map(Number);
    grupos[evento.grupoId] = { ...evento, ano, mes, dia, hora };
  });
  return Object.values(grupos);
}

function renderizarProximosEventos() {
  const container = document.getElementById("lista-proximos-eventos");
  if (!container) return;

  const hoje = normalizarData(new Date());
  const proximos = obterEventosAgrupados()
    .filter((e) => !e.feita)
    .filter((e) => normalizarData(new Date(e.ano, e.mes - 1, e.dia)) >= hoje)
    .sort((a, b) => {
      const chaveA = a.ano * 10000 + a.mes * 100 + a.dia;
      const chaveB = b.ano * 10000 + b.mes * 100 + b.dia;
      return chaveA !== chaveB ? chaveA - chaveB : a.hora - b.hora;
    })
    .slice(0, 4);

  container.innerHTML = "";
  if (proximos.length === 0) {
    container.innerHTML = `<p class="painel-vazio">Nada por aqui. Que tal planejar algo? 🙂</p>`;
    return;
  }

  proximos.forEach((evento) => {
    const dataEvento = normalizarData(new Date(evento.ano, evento.mes - 1, evento.dia));
    const rotuloData = mesmaData(dataEvento, new Date()) ? "Hoje" : `${NOMES_DIA_CURTO[dataEvento.getDay()]} ${evento.dia}`;
    const prioridade = evento.prioridadeId ? obterPrioridade(evento.prioridadeId) : null;

    const item = document.createElement("div");
    item.className = "item-proximo-evento";
    item.innerHTML = `
      <span class="ponto-proximo-evento" style="background:${evento.cor}"></span>
      <span class="texto-proximo-evento">${prioridade ? prioridade.emoji + " " : ""}${evento.texto}</span>
      <span class="quando-proximo-evento">${rotuloData} · ${HORAS[evento.hora]}</span>
    `;
    container.appendChild(item);
  });
}

function renderizarProgressoDia() {
  const barra = document.getElementById("barra-progresso-dia");
  const texto = document.getElementById("texto-progresso-dia");
  if (!barra || !texto) return;

  const isoHoje = formatarISO(new Date());
  const eventosHoje = obterEventosAgrupados().filter(
    (e) => `${e.ano}-${String(e.mes).padStart(2, "0")}-${String(e.dia).padStart(2, "0")}` === isoHoje
  );
  const total = eventosHoje.length;
  const concluidos = eventosHoje.filter((e) => e.feita).length;
  const porcentagem = total === 0 ? 0 : Math.round((concluidos / total) * 100);

  barra.style.width = `${porcentagem}%`;
  texto.textContent = total === 0 ? "Nenhuma tarefa hoje" : `${concluidos} de ${total} tarefas concluídas`;
}

// ==================================================
// TÍTULO DO PERÍODO
// ==================================================
function atualizarSaudacao() {
  const hora = new Date().getHours();
  const titulo = document.getElementById("titulo-saudacao");
  if (hora >= 5 && hora < 12) titulo.textContent = "Bom dia!";
  else if (hora >= 12 && hora < 18) titulo.textContent = "Boa tarde!";
  else titulo.textContent = "Boa noite!";
}

function atualizarTitulo() {
  const titulo = document.getElementById("titulo-periodo");
  if (visualizacao === "dia") {
    titulo.textContent = `${NOMES_DIA_CURTO[dataReferencia.getDay()]}, ${dataReferencia.getDate()} de ${NOMES_MES[dataReferencia.getMonth()]}`;
  } else if (visualizacao === "semana") {
    const inicio = obterInicioSemana(dataReferencia);
    const fim = somarDias(inicio, 6);
    titulo.textContent = `${inicio.getDate()} ${NOMES_MES[inicio.getMonth()].slice(0, 3)} — ${fim.getDate()} ${NOMES_MES[fim.getMonth()].slice(0, 3)}`;
  } else if (visualizacao === "mes") {
    titulo.textContent = `${NOMES_MES[dataReferencia.getMonth()]} de ${dataReferencia.getFullYear()}`;
  } else {
    titulo.textContent = `${dataReferencia.getFullYear()}`;
  }
}

// ==================================================
// TROCA DE VISUALIZAÇÃO E NAVEGAÇÃO
// ==================================================
function mudarVisualizacao(nova) {
  visualizacao = nova;
  document.querySelectorAll("#seletor-visualizacao button").forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.visao === nova);
  });
  atualizarVisualizacao();
}

function navegar(direcao) {
  if (visualizacao === "dia") dataReferencia = somarDias(dataReferencia, direcao);
  else if (visualizacao === "semana") dataReferencia = somarDias(dataReferencia, direcao * 7);
  else if (visualizacao === "mes") dataReferencia = normalizarData(new Date(dataReferencia.getFullYear(), dataReferencia.getMonth() + direcao, 1));
  else dataReferencia = normalizarData(new Date(dataReferencia.getFullYear() + direcao, 0, 1));
  atualizarVisualizacao();
}

function atualizarVisualizacao() {
  const areaGrid = document.getElementById("area-grid");
  const areaMes = document.getElementById("area-mes");
  const areaAno = document.getElementById("area-ano");
  const dica = document.getElementById("dica-interacao");

  areaGrid.classList.add("oculto");
  areaMes.classList.add("oculto");
  areaAno.classList.add("oculto");
  dica.classList.add("oculto");

  if (visualizacao === "dia" || visualizacao === "semana") {
    areaGrid.classList.remove("oculto");
    dica.classList.remove("oculto");
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
  renderizarProximosEventos();
  renderizarProgressoDia();
}

// --- Gerenciamento de planners ---
function renderizarListaPlanners() {
  const container = document.getElementById("lista-planners");
  container.innerHTML = "";
  listaPlanners.forEach((planner) => {
    const item = document.createElement("button");
    item.className = "nav-item" + (planner.id === plannerAtivoId ? " ativo" : "");
    item.innerHTML = `<span class="nav-icone">●</span> <span class="nav-texto">${planner.nome}</span>`;
    item.addEventListener("click", () => trocarPlanner(planner.id));
    container.appendChild(item);
  });
}

function trocarPlanner(id) {
  if (id === plannerAtivoId) return;
  plannerAtivoId = id;
  localStorage.setItem("planner-ativo", id);
  eventos = carregarEventos();
  renderizarListaPlanners();
  atualizarVisualizacao();
}

function criarPlanner(nome) {
  const id = `${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  listaPlanners.push({ id, nome });
  salvarListaPlanners();
  trocarPlanner(id);
}

// --- Categorias: legenda ---
function renderizarLegendaCategorias() {
  const container = document.getElementById("legenda-categorias");
  if (!container) return;
  container.innerHTML = "";
  categorias.forEach((cat) => {
    const span = document.createElement("span");
    span.className = "item-legenda";
    span.innerHTML = `<i style="background:${cat.cor}"></i>${cat.nome}`;
    container.appendChild(span);
  });
}

// --- Busca de eventos ---
function buscarEventos(termo) {
  const container = document.getElementById("resultados-busca");
  if (!termo.trim()) {
    container.classList.add("oculto");
    return;
  }

  const grupos = {};
  Object.entries(eventos).forEach(([chave, evento]) => {
    if (!grupos[evento.grupoId]) grupos[evento.grupoId] = { ...evento, chave };
  });

  const termoBusca = termo.trim().toLowerCase();
  const resultados = Object.values(grupos)
    .filter((e) => e.texto.toLowerCase().includes(termoBusca))
    .slice(0, 8);

  container.innerHTML = "";
  if (resultados.length === 0) {
    container.innerHTML = `<div class="resultado-busca-vazio">Nenhum evento encontrado</div>`;
  } else {
    resultados.forEach((resultado) => {
      const [ano, mes, dia] = resultado.chave.split("-").map(Number);
      const data = new Date(ano, mes - 1, dia);
      const item = document.createElement("div");
      item.className = "resultado-busca";
      item.innerHTML = `<span>${resultado.texto}</span><span class="data-resultado">${dia}/${mes}</span>`;
      item.addEventListener("click", () => {
        dataReferencia = normalizarData(data);
        visualizacao = "dia";
        document.querySelectorAll("#seletor-visualizacao button").forEach((b) => b.classList.remove("ativo"));
        document.querySelector('#seletor-visualizacao button[data-visao="dia"]').classList.add("ativo");
        grupoMarcado = resultado.grupoId;
        atualizarVisualizacao();
        container.classList.add("oculto");
        document.getElementById("input-busca").value = "";
      });
      container.appendChild(item);
    });
  }
  container.classList.remove("oculto");
}

// --- Inicialização ---
configurarEventosDoGrid();
renderizarListaPlanners();
renderizarLegendaCategorias();
atualizarVisualizacao();
atualizarSaudacao();

document.getElementById("input-busca").addEventListener("input", (ev) => {
  buscarEventos(ev.target.value);
});

document.addEventListener("click", (ev) => {
  if (!ev.target.closest(".busca-superior")) {
    document.getElementById("resultados-busca").classList.add("oculto");
  }
});

document.getElementById("botao-criar-planner").addEventListener("click", () => {
  const form = document.getElementById("form-criar-planner");
  const input = document.getElementById("input-novo-planner");
  form.classList.remove("oculto");
  input.value = "";
  input.focus();
});

document.getElementById("input-novo-planner").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    const nome = ev.target.value.trim();
    if (nome) criarPlanner(nome);
    document.getElementById("form-criar-planner").classList.add("oculto");
  }
  if (ev.key === "Escape") {
    document.getElementById("form-criar-planner").classList.add("oculto");
  }
});

document.getElementById("botao-copiar").addEventListener("click", copiarEventoMarcado);
document.getElementById("botao-excluir").addEventListener("click", excluirEventoMarcado);
document.getElementById("botao-concluir").addEventListener("click", alternarConclusaoMarcado);

document.getElementById("botao-anterior").addEventListener("click", () => navegar(-1));
document.getElementById("botao-proximo").addEventListener("click", () => navegar(1));
document.getElementById("botao-hoje").addEventListener("click", () => {
  dataReferencia = normalizarData(new Date());
  atualizarVisualizacao();
});

document.getElementById("seletor-visualizacao").addEventListener("click", (ev) => {
  const botao = ev.target.closest("button[data-visao]");
  if (botao) mudarVisualizacao(botao.dataset.visao);
});

document.getElementById("botao-criar-evento").addEventListener("click", confirmarCriacaoEvento);
document.getElementById("botao-cancelar-evento").addEventListener("click", fecharModalEvento);

document.getElementById("input-nome-evento").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") confirmarCriacaoEvento();
  if (ev.key === "Escape") fecharModalEvento();
});

document.getElementById("select-recorrencia").addEventListener("change", (ev) => {
  const tipo = ev.target.value;
  document.getElementById("container-dias-semana").classList.toggle("oculto", tipo !== "dias-especificos");
  document.getElementById("container-repeticoes").classList.toggle("oculto", tipo === "nenhuma");
});

document.getElementById("container-dias-semana").addEventListener("click", (ev) => {
  const botao = ev.target.closest(".dia-semana-opcao");
  if (botao) botao.classList.toggle("selecionado");
});

document.getElementById("botao-confirmar-categoria").addEventListener("click", confirmarNovaCategoria);
document.getElementById("botao-cancelar-categoria").addEventListener("click", fecharFormNovaCategoria);
document.getElementById("input-nome-categoria").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") confirmarNovaCategoria();
  if (ev.key === "Escape") fecharFormNovaCategoria();
});
