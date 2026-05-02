import type { Atendimento } from '../types';

export type FaixaIdade = 'filhote' | 'adulto' | 'idoso';
export type EspecieKey = 'cao' | 'gato';

export function calcFaixaIdade(
  especie: string | null | undefined,
  valor: number | null | undefined,
  unidade: string | null | undefined,
): FaixaIdade {
  if (valor == null) return 'adulto';
  const meses =
    unidade === 'anos' ? valor * 12
    : unidade === 'meses' ? valor
    : valor / 30;

  const isFelino = /felino|gato/i.test(especie ?? '');
  if (isFelino) {
    if (meses <= 12) return 'filhote';
    if (meses <= 84) return 'adulto';
    return 'idoso';
  }
  if (meses < 12) return 'filhote';
  if (meses <= 96) return 'adulto';
  return 'idoso';
}

export function getEspecieKey(especie: string | null | undefined): EspecieKey {
  return /felino|gato/i.test(especie ?? '') ? 'gato' : 'cao';
}

export interface LaudoSugestao {
  tipo: string;
  categoria: 'hemograma' | 'urinalise' | 'ions' | 'bioquimico' | 'hematocrito' | 'reticulocitos' | 'hemoparasitas' | 'sangue_oculto' | 'rpc' | 'parasitologico' | 'hemogasometria' | 'reacao_cruzada';
}

function normaliza(s: string) {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Chave bioquímica para perfis sem íons (canino não varia por faixa, felino sim)
function bioKeySimples(esp: EspecieKey, faixaBio: FaixaIdade): string {
  return esp === 'gato' ? `gato_${faixaBio}` : 'cao';
}

// Chave bioquímica para checkup3 (com íons — ambas espécies variam por faixa)
function bioKeyComFaixa(esp: EspecieKey, faixa: FaixaIdade): string {
  return `${esp}_${faixa}`;
}

function laudosParaExame(nomeExame: string, esp: EspecieKey, faixa: FaixaIdade): LaudoSugestao[] {
  const n = normaliza(nomeExame);
  const sugestoes: LaudoSugestao[] = [];

  // Felino idoso usa refs de adulto para bioquímico e hemograma (sem template separado para idoso)
  const faixaBio: FaixaIdade = (esp === 'gato' && faixa === 'idoso') ? 'adulto' : faixa;
  const faixaHemo: FaixaIdade = (esp === 'gato' && faixa === 'idoso') ? 'adulto' : faixa;
  const hemKey = esp === 'gato' ? 'felino' : 'cao';

  // ── Hemograma isolado ──────────────────────────────────────────────────────
  if (/^hemograma\b/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
  }

  // ── Urinálise isolada ──────────────────────────────────────────────────────
  if (/^urinalise\b/.test(n)) {
    sugestoes.push({ tipo: `urinalise_${esp === 'gato' ? 'gato' : 'cao'}`, categoria: 'urinalise' });
  }

  // ── Íons isolado ───────────────────────────────────────────────────────────
  if (/^ions\b/.test(n)) {
    sugestoes.push({ tipo: `ions_${esp}_${faixa}`, categoria: 'ions' });
  }

  // ── Check-up 1: Hemograma + ALT, AST, FA, Ureia, Creatinina, Proteínas Totais ──
  if (/^check-?up\s*1([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_checkup1_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Check-up 2: Hemograma + painel expandido ───────────────────────────────
  if (/^check-?up\s*2([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_checkup2_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Check-up 3: Hemograma + painel completo + Eletrólitos ─────────────────
  if (/^check-?up\s*3([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_checkup3_${bioKeyComFaixa(esp, faixa)}`, categoria: 'bioquimico' });
  }

  // ── Básico 1: Hemograma + ALT, FA, Creatinina ─────────────────────────────
  if (/^basico\s*1([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_basico1_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Básico 2: Hemograma + ALT, FA, Creatinina, Ureia ─────────────────────
  if (/^basico\s*2([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_basico2_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Básico 3: Hemograma + ALT, AST, FA, Creatinina, Ureia, Glicose ────────
  if (/^basico\s*3([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_basico3_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Hepático 1: Hemograma + ALT, AST, FA, GGT, Albumina, Proteínas Totais ──
  if (/^hepatico\s*1([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_hepatico1_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Hepático 2: Hemograma + painel hepático expandido ─────────────────────
  if (/^hepatico\s*2([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_hepatico2_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Renal 1: Hemograma + Ureia, Creatinina ────────────────────────────────
  if (/^renal\s*1([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_renal1_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Renal 2: Hemograma + Ureia, Creatinina, Albumina, Proteínas Totais ────
  if (/^renal\s*2([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_renal2_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Renal 3: Hemograma + Renal 2 + Fósforo ────────────────────────────────
  if (/^renal\s*3([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_renal3_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Renal 4: Hemograma + Renal 3 + Glicose ────────────────────────────────
  if (/^renal\s*4([^0-9]|$)/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
    sugestoes.push({ tipo: `bioquimico_renal4_${bioKeySimples(esp, faixaBio)}`, categoria: 'bioquimico' });
  }

  // ── Transfusão: apenas Hemograma (sem bioquímico) ─────────────────────────
  if (/^transfusao\b/.test(n)) {
    sugestoes.push({ tipo: `hemograma_${hemKey}_${faixaHemo}`, categoria: 'hemograma' });
  }

  // ── Hematócrito isolado ────────────────────────────────────────────────────
  if (/^hematocrito\b/.test(n)) {
    sugestoes.push({ tipo: `hematocrito_${esp}_${faixa}`, categoria: 'hematocrito' });
  }

  // ── Contagem de Reticulócitos ──────────────────────────────────────────────
  if (/^contagem de reticulocito|^reticulocito/.test(n)) {
    sugestoes.push({ tipo: `reticulocitos_${esp}`, categoria: 'reticulocitos' });
  }

  // ── Pesquisa de Hemoparasitas ──────────────────────────────────────────────
  if (/^pesquisa de hemoparasita|^hemoparasita|^ponta de orelha/.test(n)) {
    sugestoes.push({ tipo: 'hemoparasitas', categoria: 'hemoparasitas' });
  }

  // ── Pesquisa de Sangue Oculto ──────────────────────────────────────────────
  if (/^pesquisa de sangue oculto|^sangue oculto/.test(n)) {
    sugestoes.push({ tipo: 'sangue_oculto', categoria: 'sangue_oculto' });
  }

  // ── Relação Proteína:Creatinina (RPC Urinário) ────────────────────────────
  if (/^relacao proteina|^rpc urinar|^relacao proteina.creatinina/.test(n)) {
    sugestoes.push({ tipo: `rpc_${esp}`, categoria: 'rpc' });
  }

  // ── Parasitológico de Fezes / Coproparasitológico ─────────────────────────
  if (/^parasitologico|^coproparasitologic|^ovos por grama/.test(n)) {
    sugestoes.push({ tipo: 'parasitologico_fezes', categoria: 'parasitologico' });
  }

  // ── Hemogasometria ─────────────────────────────────────────────────────────
  if (/^hemogasometria arterial/.test(n)) {
    sugestoes.push({ tipo: 'hemogasometria_arterial', categoria: 'hemogasometria' });
  }
  if (/^hemogasometria venosa|^hemogasometria$/.test(n)) {
    sugestoes.push({ tipo: 'hemogasometria_venosa', categoria: 'hemogasometria' });
  }

  // ── Reação Cruzada / Teste de Compatibilidade ─────────────────────────────
  if (/^reacao cruzada|^teste de compatibilidade|^aglutinacao em salina/.test(n)) {
    sugestoes.push({ tipo: 'reacao_cruzada', categoria: 'reacao_cruzada' });
  }

  return sugestoes;
}

export function sugerirLaudoTipos(atendimento: Atendimento): LaudoSugestao[] {
  const esp = getEspecieKey(atendimento.especie);
  const faixa = calcFaixaIdade(atendimento.especie, atendimento.idade_valor, atendimento.idade_unidade);

  const seen = new Set<string>();
  const result: LaudoSugestao[] = [];

  for (const ae of atendimento.exames ?? []) {
    const nome = ae.exame_nome ?? '';
    for (const s of laudosParaExame(nome, esp, faixa)) {
      if (!seen.has(s.tipo)) {
        seen.add(s.tipo);
        result.push(s);
      }
    }
  }

  return result;
}
