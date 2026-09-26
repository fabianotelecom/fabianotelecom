import type {
  AgenteAoVivo,
  AgenteStatus,
  LinhaDashboard,
  StatusDiscador,
} from "@/lib/types";

// Dados simulados para desenvolvimento do dashboard/colméia enquanto a
// integração real com as APIs Vonix não está liberada no ambiente.

const NOMES = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Elaine",
  "Felipe",
  "Gabi",
  "Hugo",
  "Ivo",
  "Joana",
  "Kaique",
  "Lia",
  "Marcos",
  "Nina",
  "Otavio",
  "Paula",
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function gerarAgentes(qtd: number, seed: number): AgenteAoVivo[] {
  const rand = rng(seed);
  const statuses: AgenteStatus[] = [
    "atendimento",
    "disponivel",
    "pausa",
    "offline",
  ];
  // pesos: mais atendimento/disponível que pausa/offline
  const pesos = [0.42, 0.36, 0.16, 0.06];
  return Array.from({ length: qtd }, (_, i) => {
    const r = rand();
    let acc = 0;
    let status: AgenteStatus = "disponivel";
    for (let k = 0; k < statuses.length; k++) {
      acc += pesos[k];
      if (r <= acc) {
        status = statuses[k];
        break;
      }
    }
    return {
      id: `${seed}-${i}`,
      nome: NOMES[i % NOMES.length],
      status,
      ramal: String(1000 + i),
    };
  });
}

const PARCEIROS = [
  { nome: "Alfa Telecom", gestor: "Ricardo Menezes", qtd: 28, disc: "ativo" },
  { nome: "Beta Vendas", gestor: "Ricardo Menezes", qtd: 15, disc: "pausado" },
  { nome: "Gama Contact", gestor: "Sônia Prado", qtd: 42, disc: "ativo" },
  { nome: "Delta Cobranças", gestor: "Sônia Prado", qtd: 9, disc: "parado" },
  { nome: "Épsilon BPO", gestor: "Marcelo Dias", qtd: 34, disc: "ativo" },
];

export function mockLinhas(): LinhaDashboard[] {
  return PARCEIROS.map((p, idx) => {
    const agentes = gerarAgentes(p.qtd, (idx + 1) * 97);
    const offline = idx === 3; // Delta simula servidor fora do ar
    const contadores = agentes.reduce(
      (acc, a) => {
        acc[a.status] += 1;
        return acc;
      },
      { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 } as Record<
        AgenteStatus,
        number
      >,
    );
    return {
      parceiroId: `mock-${idx}`,
      nomeParceiro: p.nome,
      gestor: p.gestor,
      urlVonix: `https://${p.nome.toLowerCase().replace(/\s+/g, "")}.vonixcc.com.br`,
      online: !offline,
      statusDiscador: (offline ? "desconhecido" : p.disc) as StatusDiscador,
      contatosNaFila: offline ? 0 : Math.round((idx + 1) * 137.5),
      agentesLogados: offline
        ? 0
        : contadores.atendimento + contadores.disponivel + contadores.pausa,
      agentes: offline ? [] : agentes,
      contadores: offline
        ? { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 }
        : contadores,
      chamadasAtivas: offline ? 0 : contadores.atendimento,
      tmaSegundos: offline ? undefined : 180 + idx * 22,
      taxaOcupacao: offline ? undefined : 0.55 + idx * 0.07,
      atualizadoEm: new Date().toISOString(),
      erro: offline ? "Servidor não respondeu (timeout)" : null,
    };
  });
}
