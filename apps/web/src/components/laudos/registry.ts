import React from 'react';
import type { LaudoComponentProps } from '../../types';
import { Hemograma } from './Hemograma';
import { Urinalise } from './Urinalise';
import { Ions } from './Ions';
import { BioquimicoGeral } from './BioquimicoGeral';
import type { BioPerfil } from './BioquimicoGeral';
import { ExameSimples } from './ExameSimples';
import type { ParamDef } from './ExameSimples';
import type { EspecieKey, FaixaIdade } from '../../utils/laudoTypeMapping';

export type LaudoEntry = {
  label: string;
  component: React.ComponentType<LaudoComponentProps>;
  defaultDados: Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(Comp: React.ComponentType<any>, extra: Record<string, unknown>): React.ComponentType<LaudoComponentProps> {
  return ((props: LaudoComponentProps) => React.createElement(Comp, { ...props, ...extra })) as React.ComponentType<LaudoComponentProps>;
}

const defaultHemo: Record<string, unknown> = {
  tipo_amostra: 'Sangue total',
  metodo_analise: 'Contagem automatizada (BC-2800Vet) com verificação microscópica',
};

function bioCao(perfil: BioPerfil, faixaIdade: FaixaIdade = 'adulto') {
  return wrap(BioquimicoGeral, { perfil, especie: 'cao' as EspecieKey, faixaIdade });
}
function bioGato(perfil: BioPerfil, faixaIdade: FaixaIdade) {
  return wrap(BioquimicoGeral, { perfil, especie: 'gato' as EspecieKey, faixaIdade });
}
function simples(titulo: string, material: string, metodologia: string, params: ParamDef[]): React.ComponentType<LaudoComponentProps> {
  return wrap(ExameSimples, { titulo, material, metodologia, params });
}

export const LAUDO_REGISTRY: Record<string, LaudoEntry> = {

  // ── Hemograma ──────────────────────────────────────────────────────────────
  hemograma_cao_filhote: {
    label: 'Hemograma — Cão Filhote (< 1 ano)',
    component: wrap(Hemograma, { variante: 'cao_filhote' }),
    defaultDados: defaultHemo,
  },
  hemograma_cao_adulto: {
    label: 'Hemograma — Cão Adulto (1–8 anos)',
    component: wrap(Hemograma, { variante: 'cao_adulto' }),
    defaultDados: defaultHemo,
  },
  hemograma_cao_idoso: {
    label: 'Hemograma — Cão Idoso (> 8 anos)',
    component: wrap(Hemograma, { variante: 'cao_idoso' }),
    defaultDados: defaultHemo,
  },
  hemograma_felino_filhote: {
    label: 'Hemograma — Felino Filhote (≤ 1 ano)',
    component: wrap(Hemograma, { variante: 'felino_filhote' }),
    defaultDados: defaultHemo,
  },
  hemograma_felino_adulto: {
    label: 'Hemograma — Felino (> 1 ano)',
    component: wrap(Hemograma, { variante: 'felino_adulto' }),
    defaultDados: defaultHemo,
  },

  // ── Urinálise ──────────────────────────────────────────────────────────────
  urinalise_cao: {
    label: 'Urinálise — Canino',
    component: wrap(Urinalise, { especie: 'canino' }),
    defaultDados: {},
  },
  urinalise_gato: {
    label: 'Urinálise — Felino',
    component: wrap(Urinalise, { especie: 'felino' }),
    defaultDados: {},
  },

  // ── Íons ───────────────────────────────────────────────────────────────────
  ions_cao_filhote: {
    label: 'Íons — Cão Filhote',
    component: wrap(Ions, { especie: 'cao', faixaIdade: 'filhote' }),
    defaultDados: {},
  },
  ions_cao_adulto: {
    label: 'Íons — Cão Adulto',
    component: wrap(Ions, { especie: 'cao', faixaIdade: 'adulto' }),
    defaultDados: {},
  },
  ions_cao_idoso: {
    label: 'Íons — Cão Idoso',
    component: wrap(Ions, { especie: 'cao', faixaIdade: 'idoso' }),
    defaultDados: {},
  },
  ions_gato_filhote: {
    label: 'Íons — Felino Filhote',
    component: wrap(Ions, { especie: 'gato', faixaIdade: 'filhote' }),
    defaultDados: {},
  },
  ions_gato_adulto: {
    label: 'Íons — Felino Adulto',
    component: wrap(Ions, { especie: 'gato', faixaIdade: 'adulto' }),
    defaultDados: {},
  },
  ions_gato_idoso: {
    label: 'Íons — Felino Idoso',
    component: wrap(Ions, { especie: 'gato', faixaIdade: 'idoso' }),
    defaultDados: {},
  },

  // ── Bioquímico Básico ──────────────────────────────────────────────────────
  // ALT, FA, Creatinina
  bioquimico_basico1_cao:          { label: 'Bioquímico Básico 1 — Canino',             component: bioCao('basico1'),              defaultDados: {} },
  bioquimico_basico1_gato_filhote: { label: 'Bioquímico Básico 1 — Felino Filhote',     component: bioGato('basico1', 'filhote'),  defaultDados: {} },
  bioquimico_basico1_gato_adulto:  { label: 'Bioquímico Básico 1 — Felino Adulto/Idoso',component: bioGato('basico1', 'adulto'),   defaultDados: {} },

  // ALT, FA, Creatinina, Ureia
  bioquimico_basico2_cao:          { label: 'Bioquímico Básico 2 — Canino',             component: bioCao('basico2'),              defaultDados: {} },
  bioquimico_basico2_gato_filhote: { label: 'Bioquímico Básico 2 — Felino Filhote',     component: bioGato('basico2', 'filhote'),  defaultDados: {} },
  bioquimico_basico2_gato_adulto:  { label: 'Bioquímico Básico 2 — Felino Adulto/Idoso',component: bioGato('basico2', 'adulto'),   defaultDados: {} },

  // ALT, AST, FA, Creatinina, Ureia, Glicose
  bioquimico_basico3_cao:          { label: 'Bioquímico Básico 3 — Canino',             component: bioCao('basico3'),              defaultDados: {} },
  bioquimico_basico3_gato_filhote: { label: 'Bioquímico Básico 3 — Felino Filhote',     component: bioGato('basico3', 'filhote'),  defaultDados: {} },
  bioquimico_basico3_gato_adulto:  { label: 'Bioquímico Básico 3 — Felino Adulto/Idoso',component: bioGato('basico3', 'adulto'),   defaultDados: {} },

  // ── Bioquímico Check-up ────────────────────────────────────────────────────
  // Check-up 1: ALT, AST, FA, Ureia, Creatinina, Proteínas Totais
  bioquimico_checkup1_cao:          { label: 'Bioquímico Check-up 1 — Canino',             component: bioCao('checkup1'),              defaultDados: {} },
  bioquimico_checkup1_gato_filhote: { label: 'Bioquímico Check-up 1 — Felino Filhote',     component: bioGato('checkup1', 'filhote'),  defaultDados: {} },
  bioquimico_checkup1_gato_adulto:  { label: 'Bioquímico Check-up 1 — Felino Adulto/Idoso',component: bioGato('checkup1', 'adulto'),   defaultDados: {} },

  // Check-up 2: ALT, AST, FA, GGT, Glicose, Creatinina, Ureia, Albumina, Proteínas Totais, Triglicerídeos, Colesterol
  bioquimico_checkup2_cao:          { label: 'Bioquímico Check-up 2 — Canino',             component: bioCao('checkup2'),              defaultDados: {} },
  bioquimico_checkup2_gato_filhote: { label: 'Bioquímico Check-up 2 — Felino Filhote',     component: bioGato('checkup2', 'filhote'),  defaultDados: {} },
  bioquimico_checkup2_gato_adulto:  { label: 'Bioquímico Check-up 2 — Felino Adulto/Idoso',component: bioGato('checkup2', 'adulto'),   defaultDados: {} },

  // Check-up 3: Check-up 2 + Eletrólitos (varia por faixa para íons)
  bioquimico_checkup3_cao_filhote: { label: 'Bioquímico Check-up 3 — Cão Filhote',         component: bioCao('checkup3', 'filhote'),   defaultDados: {} },
  bioquimico_checkup3_cao_adulto:  { label: 'Bioquímico Check-up 3 — Cão Adulto',          component: bioCao('checkup3', 'adulto'),    defaultDados: {} },
  bioquimico_checkup3_cao_idoso:   { label: 'Bioquímico Check-up 3 — Cão Idoso',           component: bioCao('checkup3', 'idoso'),     defaultDados: {} },
  bioquimico_checkup3_gato_filhote:{ label: 'Bioquímico Check-up 3 — Felino Filhote',      component: bioGato('checkup3', 'filhote'),  defaultDados: {} },
  bioquimico_checkup3_gato_adulto: { label: 'Bioquímico Check-up 3 — Felino Adulto',       component: bioGato('checkup3', 'adulto'),   defaultDados: {} },
  bioquimico_checkup3_gato_idoso:  { label: 'Bioquímico Check-up 3 — Felino Idoso',        component: bioGato('checkup3', 'idoso'),    defaultDados: {} },

  // ── Bioquímico Hepático ────────────────────────────────────────────────────
  // Hepático 1: ALT, AST, FA, GGT, Albumina, Proteínas Totais
  bioquimico_hepatico1_cao:          { label: 'Bioquímico Hepático 1 — Canino',             component: bioCao('hepatico1'),              defaultDados: {} },
  bioquimico_hepatico1_gato_filhote: { label: 'Bioquímico Hepático 1 — Felino Filhote',     component: bioGato('hepatico1', 'filhote'),  defaultDados: {} },
  bioquimico_hepatico1_gato_adulto:  { label: 'Bioquímico Hepático 1 — Felino Adulto/Idoso',component: bioGato('hepatico1', 'adulto'),   defaultDados: {} },

  // Hepático 2: ALT, AST, FA, GGT, Glicose, Albumina, Proteínas Totais, Triglicerídeos, Colesterol
  bioquimico_hepatico2_cao:          { label: 'Bioquímico Hepático 2 — Canino',             component: bioCao('hepatico2'),              defaultDados: {} },
  bioquimico_hepatico2_gato_filhote: { label: 'Bioquímico Hepático 2 — Felino Filhote',     component: bioGato('hepatico2', 'filhote'),  defaultDados: {} },
  bioquimico_hepatico2_gato_adulto:  { label: 'Bioquímico Hepático 2 — Felino Adulto/Idoso',component: bioGato('hepatico2', 'adulto'),   defaultDados: {} },

  // ── Bioquímico Renal ───────────────────────────────────────────────────────
  // Renal 1: Ureia, Creatinina
  bioquimico_renal1_cao:          { label: 'Bioquímico Renal 1 — Canino',             component: bioCao('renal1'),              defaultDados: {} },
  bioquimico_renal1_gato_filhote: { label: 'Bioquímico Renal 1 — Felino Filhote',     component: bioGato('renal1', 'filhote'),  defaultDados: {} },
  bioquimico_renal1_gato_adulto:  { label: 'Bioquímico Renal 1 — Felino Adulto/Idoso',component: bioGato('renal1', 'adulto'),   defaultDados: {} },

  // Renal 2: Ureia, Creatinina, Albumina, Proteínas Totais
  bioquimico_renal2_cao:          { label: 'Bioquímico Renal 2 — Canino',             component: bioCao('renal2'),              defaultDados: {} },
  bioquimico_renal2_gato_filhote: { label: 'Bioquímico Renal 2 — Felino Filhote',     component: bioGato('renal2', 'filhote'),  defaultDados: {} },
  bioquimico_renal2_gato_adulto:  { label: 'Bioquímico Renal 2 — Felino Adulto/Idoso',component: bioGato('renal2', 'adulto'),   defaultDados: {} },

  // Renal 3: Ureia, Creatinina, Albumina, Proteínas Totais, Fósforo
  bioquimico_renal3_cao:          { label: 'Bioquímico Renal 3 — Canino',             component: bioCao('renal3'),              defaultDados: {} },
  bioquimico_renal3_gato_filhote: { label: 'Bioquímico Renal 3 — Felino Filhote',     component: bioGato('renal3', 'filhote'),  defaultDados: {} },
  bioquimico_renal3_gato_adulto:  { label: 'Bioquímico Renal 3 — Felino Adulto/Idoso',component: bioGato('renal3', 'adulto'),   defaultDados: {} },

  // Renal 4: Ureia, Creatinina, Albumina, Proteínas Totais, Fósforo, Glicose
  bioquimico_renal4_cao:          { label: 'Bioquímico Renal 4 — Canino',             component: bioCao('renal4'),              defaultDados: {} },
  bioquimico_renal4_gato_filhote: { label: 'Bioquímico Renal 4 — Felino Filhote',     component: bioGato('renal4', 'filhote'),  defaultDados: {} },
  bioquimico_renal4_gato_adulto:  { label: 'Bioquímico Renal 4 — Felino Adulto/Idoso',component: bioGato('renal4', 'adulto'),   defaultDados: {} },

  // ── Hematócrito ────────────────────────────────────────────────────────────
  hematocrito_cao_filhote: { label: 'Hematócrito — Cão Filhote',      component: simples('Hematócrito — Cão Filhote',      'Sangue total', 'Microhematócrito (centrifugação 12.000 rpm × 5 min)', [{ key: 'hematocrito', label: 'Hematócrito', unit: '%', ref: '35–52%' }]), defaultDados: {} },
  hematocrito_cao_adulto:  { label: 'Hematócrito — Cão Adulto',       component: simples('Hematócrito — Cão Adulto',       'Sangue total', 'Microhematócrito (centrifugação 12.000 rpm × 5 min)', [{ key: 'hematocrito', label: 'Hematócrito', unit: '%', ref: '37–55%' }]), defaultDados: {} },
  hematocrito_cao_idoso:   { label: 'Hematócrito — Cão Idoso',        component: simples('Hematócrito — Cão Idoso',        'Sangue total', 'Microhematócrito (centrifugação 12.000 rpm × 5 min)', [{ key: 'hematocrito', label: 'Hematócrito', unit: '%', ref: '35–52%' }]), defaultDados: {} },
  hematocrito_gato_filhote:{ label: 'Hematócrito — Felino Filhote',   component: simples('Hematócrito — Felino Filhote',   'Sangue total', 'Microhematócrito (centrifugação 12.000 rpm × 5 min)', [{ key: 'hematocrito', label: 'Hematócrito', unit: '%', ref: '26–48%' }]), defaultDados: {} },
  hematocrito_gato_adulto: { label: 'Hematócrito — Felino Adulto',    component: simples('Hematócrito — Felino Adulto',    'Sangue total', 'Microhematócrito (centrifugação 12.000 rpm × 5 min)', [{ key: 'hematocrito', label: 'Hematócrito', unit: '%', ref: '30–48%' }]), defaultDados: {} },
  hematocrito_gato_idoso:  { label: 'Hematócrito — Felino Idoso',     component: simples('Hematócrito — Felino Idoso',     'Sangue total', 'Microhematócrito (centrifugação 12.000 rpm × 5 min)', [{ key: 'hematocrito', label: 'Hematócrito', unit: '%', ref: '28–46%' }]), defaultDados: {} },

  // ── Contagem de Reticulócitos ───────────────────────────────────────────────
  reticulocitos_cao: {
    label: 'Contagem de Reticulócitos — Canino',
    component: simples('Contagem de Reticulócitos — Canino', 'Sangue total (EDTA)', 'Microscopia com corante supravital (Novo Azul de Metileno)',
      [
        { key: 'reticulocitos_pct', label: 'Reticulócitos', unit: '%', ref: '0–1,5%' },
        { key: 'reticulocitos_abs', label: 'Reticulócitos (absoluto)', unit: '/µL', ref: '0–80.000/µL' },
      ]),
    defaultDados: {},
  },
  reticulocitos_gato: {
    label: 'Contagem de Reticulócitos — Felino',
    component: simples('Contagem de Reticulócitos — Felino', 'Sangue total (EDTA)', 'Microscopia com corante supravital (Novo Azul de Metileno)',
      [
        { key: 'reticulocitos_agregados_pct', label: 'Reticulócitos Agregados', unit: '%', ref: '0–0,5%' },
        { key: 'reticulocitos_agregados_abs', label: 'Reticulócitos Agregados (abs.)', unit: '/µL', ref: '0–15.000/µL' },
        { key: 'reticulocitos_puntiformes_pct', label: 'Reticulócitos Puntiformes', unit: '%', ref: '0–10%' },
      ]),
    defaultDados: {},
  },

  // ── Pesquisa de Hemoparasitas ───────────────────────────────────────────────
  hemoparasitas: {
    label: 'Pesquisa de Hemoparasitas',
    component: simples('Pesquisa de Hemoparasitas', 'Sangue total (ponta de orelha e EDTA)', 'Análise microscópica de esfregaço sanguíneo corado (Giemsa)',
      [
        { key: 'resultado', label: 'Resultado', ref: 'Negativo', isText: true },
        { key: 'organismo', label: 'Organismo Identificado', ref: '—', isText: true },
        { key: 'eritrocitos_parasitados', label: 'Eritrócitos Parasitados', unit: '%', ref: '0%' },
      ]),
    defaultDados: { resultado: 'Negativo' },
  },

  // ── Pesquisa de Sangue Oculto ───────────────────────────────────────────────
  sangue_oculto: {
    label: 'Pesquisa de Sangue Oculto',
    component: simples('Pesquisa de Sangue Oculto', 'Fezes frescas (≤ 24 h refrigeradas)', 'Método quimioluminescente (Hemoccult)',
      [
        { key: 'resultado', label: 'Resultado', ref: 'Negativo', isText: true },
      ]),
    defaultDados: { resultado: 'Negativo' },
  },

  // ── Relação Proteína:Creatinina Urinária (RPC) ─────────────────────────────
  rpc_cao: {
    label: 'Relação Proteína:Creatinina Urinária — Canino',
    component: simples('Relação Proteína:Creatinina Urinária — Canino', 'Urina (jato médio ou cistocentese)', 'Método colorimétrico – Biuret (proteína) / Jaffé cinético (creatinina)',
      [
        { key: 'rpc', label: 'RPC', ref: '< 0,2 (normal)' },
      ]),
    defaultDados: {},
  },
  rpc_gato: {
    label: 'Relação Proteína:Creatinina Urinária — Felino',
    component: simples('Relação Proteína:Creatinina Urinária — Felino', 'Urina (jato médio ou cistocentese)', 'Método colorimétrico – Biuret (proteína) / Jaffé cinético (creatinina)',
      [
        { key: 'rpc', label: 'RPC', ref: '< 0,2 (normal)' },
      ]),
    defaultDados: {},
  },

  // ── Parasitológico de Fezes / Coproparasitológico ──────────────────────────
  parasitologico_fezes: {
    label: 'Parasitológico de Fezes',
    component: simples('Parasitológico de Fezes', 'Fezes frescas (≤ 24 h refrigeradas)', 'Willis-Mollay (flutuação) · Sedimentação espontânea · Direto',
      [
        { key: 'metodo',     label: 'Método Utilizado', ref: '—', isText: true },
        { key: 'resultado',  label: 'Resultado',        ref: 'Negativo', isText: true },
        { key: 'parasitas',  label: 'Parasitas/Ovos Encontrados', ref: '—', isText: true },
        { key: 'opg',        label: 'OPG (Ovos por Grama)', unit: 'ovos/g', ref: '0' },
      ]),
    defaultDados: { resultado: 'Negativo' },
  },

  // ── Hemogasometria Arterial ─────────────────────────────────────────────────
  hemogasometria_arterial: {
    label: 'Hemogasometria Arterial',
    component: simples('Hemogasometria Arterial', 'Sangue arterial heparinizado (sem bolhas de ar)', 'Eletrodo de íon seletivo e amperometria · Analisador portátil (iStat / EPOC)',
      [
        { key: 'ph',       label: 'pH',             ref: '7,35–7,45'  },
        { key: 'pco2',     label: 'pCO₂',           unit: 'mmHg', ref: '36–44'   },
        { key: 'po2',      label: 'pO₂',            unit: 'mmHg', ref: '85–105'  },
        { key: 'hco3',     label: 'HCO₃⁻',          unit: 'mEq/L', ref: '18–26'  },
        { key: 'be',       label: 'Excesso de Base (BE)', unit: 'mEq/L', ref: '-4 a +4' },
        { key: 'spo2',     label: 'SpO₂',           unit: '%',    ref: '> 95'   },
        { key: 'na',       label: 'Sódio (Na⁺)',    unit: 'mEq/L', ref: '140–155' },
        { key: 'k',        label: 'Potássio (K⁺)',  unit: 'mEq/L', ref: '3,5–5,5' },
        { key: 'cl',       label: 'Cloreto (Cl⁻)',  unit: 'mEq/L', ref: '105–120' },
        { key: 'glicose',  label: 'Glicose',        unit: 'mg/dL', ref: '70–120'  },
        { key: 'lactato',  label: 'Lactato',        unit: 'mmol/L', ref: '< 2,0'  },
        { key: 'anion_gap',label: 'Ânion Gap',      unit: 'mEq/L', ref: '12–24'   },
      ]),
    defaultDados: {},
  },

  // ── Hemogasometria Venosa ───────────────────────────────────────────────────
  hemogasometria_venosa: {
    label: 'Hemogasometria Venosa',
    component: simples('Hemogasometria Venosa', 'Sangue venoso heparinizado (sem bolhas de ar)', 'Eletrodo de íon seletivo e amperometria · Analisador portátil (iStat / EPOC)',
      [
        { key: 'ph',       label: 'pH',             ref: '7,32–7,42'  },
        { key: 'pco2',     label: 'pCO₂',           unit: 'mmHg', ref: '38–52'   },
        { key: 'po2',      label: 'pO₂',            unit: 'mmHg', ref: '24–55'   },
        { key: 'hco3',     label: 'HCO₃⁻',          unit: 'mEq/L', ref: '18–26'  },
        { key: 'be',       label: 'Excesso de Base (BE)', unit: 'mEq/L', ref: '-4 a +4' },
        { key: 'spo2',     label: 'SpO₂',           unit: '%',    ref: '40–75'   },
        { key: 'na',       label: 'Sódio (Na⁺)',    unit: 'mEq/L', ref: '140–155' },
        { key: 'k',        label: 'Potássio (K⁺)',  unit: 'mEq/L', ref: '3,5–5,5' },
        { key: 'cl',       label: 'Cloreto (Cl⁻)',  unit: 'mEq/L', ref: '105–120' },
        { key: 'glicose',  label: 'Glicose',        unit: 'mg/dL', ref: '70–120'  },
        { key: 'lactato',  label: 'Lactato',        unit: 'mmol/L', ref: '< 2,0'  },
        { key: 'anion_gap',label: 'Ânion Gap',      unit: 'mEq/L', ref: '12–24'   },
      ]),
    defaultDados: {},
  },

  // ── Reação Cruzada / Teste de Compatibilidade ──────────────────────────────
  reacao_cruzada: {
    label: 'Reação Cruzada (Teste de Compatibilidade)',
    component: simples('Reação Cruzada — Teste de Compatibilidade', 'Soro do receptor + células do doador', 'Aglutinação em salina (fase I) · Até 2 doadores',
      [
        { key: 'doadores',          label: 'Doadores Avaliados', ref: '—', isText: true },
        { key: 'cruzamento_maior',  label: 'Cruzamento Maior (receptor × doador)', ref: 'Compatível', isText: true },
        { key: 'cruzamento_menor',  label: 'Cruzamento Menor (doador × receptor)', ref: 'Compatível', isText: true },
        { key: 'controle_salina',   label: 'Controle Salina',   ref: 'Negativo', isText: true },
      ]),
    defaultDados: { controle_salina: 'Negativo' },
  },
};
