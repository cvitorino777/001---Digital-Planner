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
// --- Categorias fixas ---
const CATEGORIAS = {
  1: { id: "trabalho", nome: "Trabalho", cor: "#378ADD" },
  2: { id: "faculdade", nome: "Faculdade", cor: "#7F77DD" },
  3: { id: "musica", nome: "Música", cor: "#D4537E" },
  4: { id: "pessoal", nome: "Pessoal", cor: "#639922" },
  5: { id: "outro", nome: "Outro", cor: "#D85A30" },
};

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
let eventos = carregarEventos(); // { "2026-08-01-3": { texto, categoriaId, cor, grupoId, primeira, feita }, ... }
let visualizacao = "semana"; // dia | semana | mes | ano
let dataReferencia = normalizarData(new Date());

let selecionando = false;
let dataSelecao = null;
let inicioSelecao = null;
let fimSelecao = null;
let grupoMarcado = null;
let areaTransferencia = null;
let selecaoPendente = null;

// --- Armazenamento local ---
function carregarEventos() {
  const salvo = localStorage.getItem(chaveEventosDoPlanner(plannerAtivoId));
  return salvo ? JSON.parse(salvo) : {};
}

function salvarEventos() {
  localStorage.setItem(chaveEventosDoPlanner(plannerAtivoId), JSON.stringify(eventos));
}

// --- Criar / colar evento ---
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
      if (evento.primeira) celula.textContent = evento.texto;
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

let categoriaSelecionadaId = 1;

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

function montarOpcoesCategoria() {
  const container = document.getElementById("opcoes-categoria");
  container.innerHTML = "";
  Object.entries(CATEGORIAS).forEach(([numero, cat]) => {
    const opcao = document.createElement("button");
    opcao.type = "button";
    opcao.className = "opcao-categoria" + (Number(numero) === categoriaSelecionadaId ? " selecionada" : "");
    opcao.dataset.numero = numero;
    opcao.innerHTML = `<i style="background:${cat.cor}"></i>${cat.nome}`;
    opcao.addEventListener("click", () => {
      categoriaSelecionadaId = Number(numero);
      container.querySelectorAll(".opcao-categoria").forEach((el) => el.classList.remove("selecionada"));
      opcao.classList.add("selecionada");
    });
    container.appendChild(opcao);
  });
}

function abrirModalEvento(celulaReferencia) {
  const modal = document.getElementById("modal-evento");
  const input = document.getElementById("input-nome-evento");

  montarOpcoesCategoria();
  modal.classList.remove("oculto");

  const posicao = celulaReferencia.getBoundingClientRect();
  const espacoAbaixo = window.innerHeight - posicao.bottom;
  if (espacoAbaixo > 180) {
    modal.style.top = `${posicao.bottom + 6}px`;
  } else {
    modal.style.top = `${posicao.top - 190}px`;
  }
  let esquerda = posicao.left;
  if (esquerda + 230 > window.innerWidth) esquerda = window.innerWidth - 236;
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
  const categoria = CATEGORIAS[categoriaSelecionadaId];
  criarEvento(new Date(ano, mes - 1, dia), de, ate - de + 1, texto, categoria);
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
  criarEvento(new Date(ano, mes - 1, dia), horaInicio, areaTransferencia.tamanho, areaTransferencia.texto, areaTransferencia.categoria);
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
  document.getElementById("numero-concluidos").textContent = concluidos;
  document.getElementById("numero-hoje").textContent = hojeUnicos;
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
