import { useIsMobile } from '@/hooks/use-mobile';
import { ApontamentoMobile } from '@/components/apontamento/ApontamentoMobile';
import { ApontamentoDesktop } from '@/components/apontamento/ApontamentoDesktop';

export default function ApontamentoDiario() {
  const isMobile = useIsMobile();

  // During initial render, isMobile may be undefined
  // Show nothing briefly to avoid flash
  if (isMobile === undefined) {
    return null;
  }

  return isMobile ? <ApontamentoMobile /> : <ApontamentoDesktop />;
}
