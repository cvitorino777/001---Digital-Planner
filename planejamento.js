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
const CHAVE_STORAGE = "planner-eventos-todos";

// --- Categorias fixas ---
const CATEGORIAS = {
  1: { id: "trabalho", nome: "Trabalho", cor: "#378ADD" },
  2: { id: "faculdade", nome: "Faculdade", cor: "#7F77DD" },
  3: { id: "musica", nome: "Música", cor: "#D4537E" },
  4: { id: "pessoal", nome: "Pessoal", cor: "#639922" },
  5: { id: "outro", nome: "Outro", cor: "#D85A30" },
};

function perguntarCategoria() {
  const opcoes = Object.entries(CATEGORIAS)
    .map(([numero, cat]) => `${numero} - ${cat.nome}`)
    .join("\n");
  const escolha = prompt(`Categoria:\n${opcoes}`, "1");
  return CATEGORIAS[escolha] || CATEGORIAS[5];
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

// --- Estado em memória ---
let eventos = carregarEventos(); // { "2026-08-01-3": { texto, categoriaId, cor, grupoId, primeira, feita }, ... }
let visualizacao = "semana"; // dia | semana | mes | ano
let dataReferencia = normalizarData(new Date());

let selecionando = false;
let dataSelecao = null;
let inicioSelecao = null;
let fimSelecao = null;
let grupoMarcado = null;
let areaTransferencia = null;

// --- Armazenamento local ---
function carregarEventos() {
  const salvo = localStorage.getItem(CHAVE_STORAGE);
  return salvo ? JSON.parse(salvo) : {};
}

function salvarEventos() {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(eventos));
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
    celula.style.backgroundColor = "";
    celula.textContent = "";

    if (evento) {
      celula.classList.add("evento");
      if (evento.feita) celula.classList.add("concluido");
      celula.style.backgroundColor = evento.cor;
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

function finalizarSelecao() {
  if (!selecionando) return;
  selecionando = false;

  const [de, ate] = [inicioSelecao, fimSelecao].sort((a, b) => a - b);
  document.querySelectorAll(".slot.selecionando").forEach((c) => c.classList.remove("selecionando"));

  const texto = prompt("Nome do evento:");
  if (texto && texto.trim()) {
    const categoria = perguntarCategoria();
    const [ano, mes, dia] = dataSelecao.split("-").map(Number);
    criarEvento(new Date(ano, mes - 1, dia), de, ate - de + 1, texto.trim(), categoria);
  }
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

// --- Inicialização ---
configurarEventosDoGrid();
atualizarVisualizacao();

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
