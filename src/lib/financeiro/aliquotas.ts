export interface AliquotasTributarias {
  iss: number;
  pis: number;
  cofins: number;
  irpj: number;
  csll: number;
}

export const ALIQUOTAS_PADRAO: AliquotasTributarias = {
  iss: 0.03,
  pis: 0.0065,
  cofins: 0.03,
  irpj: 0.048,
  csll: 0.0288,
};

export function getAliquotas(): AliquotasTributarias {
  try {
    const saved = localStorage.getItem('powerconcept_aliquotas');
    if (saved) return JSON.parse(saved);
  } catch {}
  return ALIQUOTAS_PADRAO;
}

export function saveAliquotas(aliquotas: AliquotasTributarias) {
  localStorage.setItem('powerconcept_aliquotas', JSON.stringify(aliquotas));
}

export function calcularImpostosDRE(receitaBruta: number, aliquotas: AliquotasTributarias) {
  return {
    iss: receitaBruta * aliquotas.iss,
    pis: receitaBruta * aliquotas.pis,
    cofins: receitaBruta * aliquotas.cofins,
    deducoes: receitaBruta * (aliquotas.iss + aliquotas.pis + aliquotas.cofins),
    irpj: receitaBruta * aliquotas.irpj,
    csll: receitaBruta * aliquotas.csll,
    impostosLucro: receitaBruta * (aliquotas.irpj + aliquotas.csll),
  };
}
