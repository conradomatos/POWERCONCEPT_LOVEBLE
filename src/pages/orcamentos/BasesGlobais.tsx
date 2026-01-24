import { Link } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Layers, 
  HardHat, 
  Cog, 
  Truck, 
  Calculator, 
  Percent 
} from 'lucide-react';

const bases = [
  {
    title: 'Catálogo de Materiais',
    description: 'Materiais com preço e HH de referência',
    icon: Package,
    href: '/orcamentos/bases/materiais',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    title: 'Templates WBS',
    description: 'Estruturas de projeto reutilizáveis',
    icon: Layers,
    href: '/orcamentos/bases/wbs-templates',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  {
    title: 'Catálogo de Funções',
    description: 'Funções de mão de obra e salários base',
    icon: HardHat,
    href: '/orcamentos/bases/mo-funcoes',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    title: 'Parâmetros de MO',
    description: 'Conjuntos de encargos e adicionais',
    icon: Cog,
    href: '/orcamentos/bases/mo-parametros',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-950',
  },
  {
    title: 'Catálogo de Equipamentos',
    description: 'Equipamentos para locação com preços de referência',
    icon: Truck,
    href: '/orcamentos/bases/equipamentos',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  {
    title: 'Conjuntos de Impostos',
    description: 'Regras de impostos reutilizáveis',
    icon: Calculator,
    href: '/orcamentos/bases/impostos',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
  {
    title: 'Conjuntos de Markup',
    description: 'Regras de markup/BDI reutilizáveis',
    icon: Percent,
    href: '/orcamentos/bases/markup',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-950',
  },
];

export default function BasesGlobais() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bases Globais</h1>
        <p className="text-muted-foreground">
          Catálogos e templates reutilizáveis em todos os orçamentos. Selecione uma base no menu lateral ou clique em um card abaixo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bases.map((base) => (
          <Link key={base.href} to={base.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/50">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg ${base.bgColor} flex items-center justify-center mb-2`}>
                  <base.icon className={`h-6 w-6 ${base.color}`} />
                </div>
                <CardTitle className="text-lg">{base.title}</CardTitle>
                <CardDescription>{base.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
