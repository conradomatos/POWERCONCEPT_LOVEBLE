import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { buildDREEstrutura, getCategoriasOrfas } from '@/lib/conciliacao/dre';
import type { DRELinha, DRESecao } from '@/lib/conciliacao/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, FileText, AlertTriangle, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ANOS = ['2025', '2026'];

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function DRELinhaRow({ linha }: { linha: DRELinha }) {
  const [expanded, setExpanded] = useState(false);
  const hasCategorias = linha.categorias && linha.categorias.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between py-1.5 px-3 rounded-sm transition-colors",
          hasCategorias && "hover:bg-muted/10 cursor-pointer",
        )}
        onClick={() => hasCategorias && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {hasCategorias ? (
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-90")} />
          ) : (
            <div className="w-3.5" />
          )}
          <span className="text-sm text-muted-foreground">({linha.sinal})</span>
          <span className="text-sm">{linha.nome}</span>
          {hasCategorias && (
            <span className="text-xs text-muted-foreground">({linha.categorias!.length})</span>
          )}
          {!hasCategorias && linha.tipo === 'conta' && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs">
              Sem categorias
            </Badge>
          )}
        </div>
        <span className={cn(
          "text-sm font-mono tabular-nums",
          linha.valor > 0 && "text-emerald-400",
          linha.valor < 0 && "text-red-400",
          linha.valor === 0 && "text-muted-foreground",
        )}>
          {formatBRL(linha.valor)}
        </span>
      </div>
      {expanded && hasCategorias && (
        <div className="ml-10 mb-2 py-1 px-3 bg-muted/5 rounded border-l-2 border-muted">
          {linha.categorias!.map((cat, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="text-xs text-muted-foreground">· {cat}</span>
              <span className="text-xs text-muted-foreground font-mono">R$ 0,00</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DRESubtotalRow({ linha }: { linha: DRELinha }) {
  const isTotal = linha.tipo === 'total';
  return (
    <div className={cn(
      "flex items-center justify-between py-2 px-3",
      isTotal ? "bg-muted/10 border-t-2 border-b-2 border-primary/30 mt-2" : "bg-muted/5",
    )}>
      <span className={cn("font-bold", isTotal ? "text-base" : "text-sm")}>
        (=) {linha.nome}
      </span>
      <span className={cn(
        "font-mono font-bold tabular-nums",
        isTotal ? "text-base" : "text-sm",
        linha.valor > 0 && "text-emerald-400",
        linha.valor < 0 && "text-red-400",
        linha.valor === 0 && "text-muted-foreground",
      )}>
        {formatBRL(linha.valor)}
      </span>
    </div>
  );
}

function DRESecaoBlock({ secao }: { secao: DRESecao }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{secao.titulo}</h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      {secao.linhas.map(l => <DRELinhaRow key={l.id} linha={l} />)}
      {secao.subtotal && (
        <>
          <Separator className="my-1" />
          <DRESubtotalRow linha={secao.subtotal} />
        </>
      )}
    </div>
  );
}

export default function FinanceiroDRE() {
  const now = new Date();
  const [mes, setMes] = useState(MESES[now.getMonth()]);
  const [ano, setAno] = useState(String(now.getFullYear()));

  const periodo = `${mes} ${ano}`;
  const dre = useMemo(() => buildDREEstrutura(periodo), [periodo]);
  const categoriasOrfas = useMemo(() => getCategoriasOrfas(), []);

  const kpis = [
    { label: 'Receita Bruta', valor: 0, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Custos Totais', valor: 0, icon: TrendingDown, color: 'text-red-400' },
    { label: 'Despesas Operac.', valor: 0, icon: DollarSign, color: 'text-red-400' },
    { label: 'Resultado Líquido', valor: 0, icon: BarChart3, color: 'text-muted-foreground' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> DRE — Demonstrativo de Resultado
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Demonstrativo de resultado do exercício.</p>
        </div>

        {/* Period + Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" disabled title="Disponível após importar dados">
            <FileText className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>

        {/* Orphan categories alert */}
        {categoriasOrfas.length > 0 && (
          <Alert className="border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>{categoriasOrfas.length} categorias sem conta DRE</AlertTitle>
            <AlertDescription>
              Essas categorias não aparecerão no DRE.
              <Link to="/financeiro/categorias" className="underline ml-1">Vincular na página de categorias →</Link>
            </AlertDescription>
          </Alert>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(kpi => (
            <div key={kpi.label} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <kpi.icon className="h-3.5 w-3.5" />
                {kpi.label}
              </div>
              <p className={cn("text-lg font-bold font-mono tabular-nums", kpi.color)}>
                {formatBRL(kpi.valor)}
              </p>
            </div>
          ))}
        </div>

        {/* DRE Table */}
        <div className="border rounded-lg p-4 sm:p-6">
          <div className="text-center mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Demonstrativo de Resultado do Exercício (DRE)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Período: {periodo}</p>
          </div>

          {dre.secoes.map(secao => <DRESecaoBlock key={secao.id} secao={secao} />)}

          {/* Final result */}
          <div className="mt-4 border-t-2 border-b-2 border-primary/30 py-3 px-3 bg-muted/10 flex items-center justify-between">
            <span className="text-base font-bold">(=) RESULTADO FINAL</span>
            <span className={cn(
              "text-base font-mono font-bold tabular-nums",
              dre.resultado.valor > 0 && "text-emerald-400",
              dre.resultado.valor < 0 && "text-red-400",
              dre.resultado.valor === 0 && "text-muted-foreground",
            )}>
              {formatBRL(dre.resultado.valor)}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
