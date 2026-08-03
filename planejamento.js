// --- Configuração do grid ---
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const HORAS = [
  "1AM", "2AM", "3AM", "4AM", "5AM", "6AM", "7AM", "8AM",
  "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM",
  "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM",
];
const NOMES_DIA = { dom: "Dom", seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb" };

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
  return CATEGORIAS[escolha] || CATEGORIAS[5]; // se digitar errado, cai em "Outro"
}

// --- Cálculo da semana atual ---
function obterInicioSemana() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  hoje.setDate(hoje.getDate() - hoje.getDay()); // volta até o domingo
  return hoje;
}

function obterDatasDaSemana() {
  const inicio = obterInicioSemana();
  return DIAS.map((dia, indice) => {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + indice);
    return { dia, data };
  });
}

function chaveStorageDaSemana() {
  const inicio = obterInicioSemana();
  const iso = inicio.toISOString().slice(0, 10); // ex: "2026-08-02"
  return `planner-eventos-${iso}`;
}

function preencherCabecalhoDatas() {
  obterDatasDaSemana().forEach(({ dia, data }) => {
    const th = document.querySelector(`th[data-day="${dia}"]`);
    th.textContent = `${NOMES_DIA[dia]} ${data.getDate()}`;
  });
}

const CHAVE_STORAGE = chaveStorageDaSemana();

// --- Estado em memória ---
let eventos = carregarEventos(); // { "seg-3": { texto, cor, grupoId }, ... }
let selecionando = false;
let diaSelecao = null;
let inicioSelecao = null;
let fimSelecao = null;
let grupoMarcado = null; // id do evento clicado (pra copiar/excluir)
let areaTransferencia = null; // { texto, cor, tamanho }

// --- Montagem do grid ---
function montarGrid() {
  const corpo = document.getElementById("corpo-grid");
  corpo.innerHTML = "";

  HORAS.forEach((hora, indiceHora) => {
    const linha = document.createElement("tr");

    const celulaHora = document.createElement("td");
    celulaHora.textContent = hora;
    celulaHora.className = "celula-hora";
    linha.appendChild(celulaHora);

    DIAS.forEach((dia) => {
      const celula = document.createElement("td");
      celula.className = "slot";
      celula.dataset.dia = dia;
      celula.dataset.hora = indiceHora;
      linha.appendChild(celula);
    });

    corpo.appendChild(linha);
  });
}

// --- Armazenamento local ---
function carregarEventos() {
  const salvo = localStorage.getItem(CHAVE_STORAGE);
  return salvo ? JSON.parse(salvo) : {};
}

function salvarEventos() {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(eventos));
}

// --- Pintar os eventos já salvos no grid ---
function renderizarEventos() {
  document.querySelectorAll(".slot").forEach((celula) => {
    const chave = `${celula.dataset.dia}-${celula.dataset.hora}`;
    const evento = eventos[chave];

    celula.classList.remove("evento", "marcado", "concluido");
    celula.style.backgroundColor = "";
    celula.textContent = "";

    if (evento) {
      celula.classList.add("evento");
      if (evento.feita) celula.classList.add("concluido");
      celula.style.backgroundColor = evento.cor;
      if (evento.grupoId === grupoMarcado) {
        celula.classList.add("marcado");
      }
      // Só escreve o texto na primeira célula do bloco, pra não repetir
      if (evento.primeira) {
        celula.textContent = evento.texto;
      }
    }
  });
}

// --- Seleção por clique e arraste (dentro do mesmo dia) ---
function iniciarSelecao(celula) {
  if (celula.classList.contains("evento")) return; // não inicia arraste em cima de evento
  selecionando = true;
  diaSelecao = celula.dataset.dia;
  inicioSelecao = Number(celula.dataset.hora);
  fimSelecao = inicioSelecao;
  destacarSelecao();
}

function estenderSelecao(celula) {
  if (!selecionando || celula.dataset.dia !== diaSelecao) return;
  fimSelecao = Number(celula.dataset.hora);
  destacarSelecao();
}

function destacarSelecao() {
  const [de, ate] = [inicioSelecao, fimSelecao].sort((a, b) => a - b);
  document.querySelectorAll(".slot").forEach((celula) => {
    const dentro =
      celula.dataset.dia === diaSelecao &&
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
    criarEvento(diaSelecao, de, ate - de + 1, texto.trim(), categoria);
  }
}

// --- Criar / colar evento ---
function criarEvento(dia, horaInicio, tamanho, texto, categoria, feitaForcada) {
  const grupoId = `${dia}-${horaInicio}-${Date.now()}`;
  const cat = categoria || CATEGORIAS[5];

  for (let i = 0; i < tamanho; i++) {
    const chave = `${dia}-${horaInicio + i}`;
    eventos[chave] = { texto, categoriaId: cat.id, cor: cat.cor, grupoId, primeira: i === 0, feita: feitaForcada || false };
  }

  salvarEventos();
  renderizarEventos();
  atualizarContadores();
}

function alternarConclusaoMarcado() {
  if (!grupoMarcado) return;
  const novoEstado = !Object.values(eventos).find((e) => e.grupoId === grupoMarcado).feita;
  Object.keys(eventos).forEach((chave) => {
    if (eventos[chave].grupoId === grupoMarcado) eventos[chave].feita = novoEstado;
  });
  salvarEventos();
  renderizarEventos();
  atualizarContadores();
  esconderBarra();
}

// --- Copiar / colar / excluir ---
function marcarEvento(celula) {
  const chave = `${celula.dataset.dia}-${celula.dataset.hora}`;
  const evento = eventos[chave];
  if (!evento) {
    grupoMarcado = null;
    esconderBarra();
    renderizarEventos();
    return;
  }

  grupoMarcado = evento.grupoId;
  renderizarEventos();
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
  renderizarEventos();
  atualizarContadores();
  esconderBarra();
}

// --- Contadores (Pendentes / Hoje / Concluídos) ---
function obterDiaDeHoje() {
  const indice = new Date().getDay(); // 0 = domingo ... 6 = sábado
  return DIAS[indice] || null; // undefined pra sábado, já que não está no grid
}

function atualizarContadores() {
  const grupos = {};
  Object.values(eventos).forEach((evento) => {
    grupos[evento.grupoId] = evento; // guarda só um representante de cada grupo
  });
  const listaEventos = Object.values(grupos);

  const concluidos = listaEventos.filter((e) => e.feita).length;
  const pendentes = listaEventos.length - concluidos;
  const diaHoje = obterDiaDeHoje();
  const hoje = listaEventos.filter((e) => e.grupoId.startsWith(`${diaHoje}-`)).length;

  document.getElementById("numero-pendentes").textContent = pendentes;
  document.getElementById("numero-concluidos").textContent = concluidos;
  document.getElementById("numero-hoje").textContent = hoje;
}

function tentarColar(celula) {
  if (!areaTransferencia || celula.classList.contains("evento")) return false;
  const dia = celula.dataset.dia;
  const horaInicio = Number(celula.dataset.hora);
  criarEvento(dia, horaInicio, areaTransferencia.tamanho, areaTransferencia.texto, areaTransferencia.categoria);
  areaTransferencia = null;
  return true;
}

// --- Eventos de mouse no grid ---
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

// --- Inicialização ---
preencherCabecalhoDatas();
montarGrid();
renderizarEventos();
configurarEventosDoGrid();
atualizarContadores();

document.getElementById("botao-copiar").addEventListener("click", copiarEventoMarcado);
document.getElementById("botao-excluir").addEventListener("click", excluirEventoMarcado);
document.getElementById("botao-concluir").addEventListener("click", alternarConclusaoMarcado);
