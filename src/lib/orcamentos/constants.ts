// Constants for the Orçamentos module

export const UNIDADES_PADRAO = [
  { value: 'pç', label: 'Peça (pç)' },
  { value: 'un', label: 'Unidade (un)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro quadrado (m²)' },
  { value: 'm³', label: 'Metro cúbico (m³)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'br', label: 'Barra (br)' },
  { value: 'cj', label: 'Conjunto (cj)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'rl', label: 'Rolo (rl)' },
  { value: 'lt', label: 'Litro (lt)' },
  { value: 'gl', label: 'Galão (gl)' },
  { value: 'vb', label: 'Verba (vb)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'dia', label: 'Dia (dia)' },
  { value: 'mês', label: 'Mês (mês)' },
];

export const HORAS_MENSAIS_PADRAO = 220;

export const CATEGORIAS_MATERIAL = [
  'Cabos',
  'Eletrodutos',
  'Eletrocalhas',
  'Conexões',
  'Disjuntores',
  'Quadros',
  'Instrumentação',
  'Automação',
  'Painéis',
  'Motores',
  'Inversores',
  'Transformadores',
  'Iluminação',
  'Tomadas',
  'Aterramento',
  'Para-raios',
  'SPDA',
  'Suportes',
  'Consumíveis',
  'Ferramentas',
  'EPI',
  'Outros',
];

export const TIPOS_PARTIDA = [
  { value: 'DIRETA', label: 'Partida Direta' },
  { value: 'ESTRELA_TRIANGULO', label: 'Estrela-Triângulo' },
  { value: 'COMPENSADOR', label: 'Compensador' },
  { value: 'SOFTSTARTER', label: 'Soft-Starter' },
  { value: 'INVERSOR', label: 'Inversor de Frequência' },
];

export const TENSOES_PADRAO = [
  { value: 220, label: '220V' },
  { value: 380, label: '380V' },
  { value: 440, label: '440V' },
  { value: 480, label: '480V' },
  { value: 4160, label: '4.16kV' },
  { value: 6600, label: '6.6kV' },
  { value: 13800, label: '13.8kV' },
];
