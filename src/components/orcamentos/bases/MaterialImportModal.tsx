import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  RefreshCw,
  Minus
} from 'lucide-react';
import { useMaterialCatalogImport, type ImportPreviewRow, type ColumnMapping } from '@/hooks/orcamentos/useMaterialCatalogImport';
import { formatCurrency } from '@/lib/currency';

interface MaterialImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'upload' | 'preview';

export function MaterialImportModal({ open, onOpenChange, onSuccess }: MaterialImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fullUpdate, setFullUpdate] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const {
    isProcessing,
    preview,
    summary,
    duplicates,
    columnMapping,
    headers,
    canImport,
    canFullUpdate,
    processFile,
    applyImport,
    reset,
    updateMapping,
    downloadTemplate,
  } = useMaterialCatalogImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    await processFile(file);
    if (columnMapping) {
      setStep('preview');
    }
  };

  const handleClose = () => {
    reset();
    setStep('upload');
    setFileName('');
    setFullUpdate(false);
    setActiveTab('all');
    onOpenChange(false);
  };

  const handleApply = async () => {
    const success = await applyImport(fullUpdate);
    if (success) {
      onSuccess?.();
      handleClose();
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    if (!columnMapping) return;
    const newMapping = { ...columnMapping, [field]: parseInt(value) };
    updateMapping(newMapping);
  };

  // Filter preview based on active tab
  const filteredPreview = preview.filter(row => {
    if (activeTab === 'all') return true;
    if (activeTab === 'novo') return row.status === 'NOVO';
    if (activeTab === 'update') return row.status === 'UPDATE_PRECO';
    if (activeTab === 'igual') return row.status === 'IGUAL';
    if (activeTab === 'erro') return row.status === 'ERRO';
    return true;
  });

  const getStatusBadge = (status: ImportPreviewRow['status']) => {
    switch (status) {
      case 'NOVO':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Novo</Badge>;
      case 'UPDATE_PRECO':
        return <Badge className="bg-blue-500 text-white"><RefreshCw className="h-3 w-3 mr-1" />Atualizar</Badge>;
      case 'IGUAL':
        return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />Igual</Badge>;
      case 'ERRO':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Catálogo de Materiais
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' 
              ? 'Selecione um arquivo CSV ou XLSX para importar' 
              : 'Revise os dados antes de aplicar a importação'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* File upload area */}
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {fileName || 'Clique para selecionar um arquivo'}
              </p>
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: CSV, XLSX
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Column mapping (if file loaded but mapping incomplete) */}
            {headers.length > 0 && !columnMapping && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Não foi possível detectar todas as colunas obrigatórias automaticamente. 
                  Verifique se o arquivo contém: codigo, descricao, unidade, preco_ref
                </AlertDescription>
              </Alert>
            )}

            {columnMapping && headers.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">Mapeamento de Colunas (Auto-detectado)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(['codigo', 'descricao', 'unidade', 'preco_ref', 'hh_ref', 'categoria'] as const).map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">
                        {field} {['codigo', 'descricao', 'unidade', 'preco_ref'].includes(field) && '*'}
                      </Label>
                      <Select
                        value={String(columnMapping[field] ?? '')}
                        onValueChange={(v) => handleMappingChange(field, v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Não mapeado</SelectItem>
                          {headers.map((header, idx) => (
                            <SelectItem key={idx} value={String(idx)}>
                              {header || `Coluna ${idx + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download template */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
              
              <Button
                onClick={() => setStep('preview')}
                disabled={!columnMapping || preview.length === 0}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Duplicates warning */}
            {duplicates.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Códigos duplicados encontrados no arquivo:</p>
                  <ul className="text-sm space-y-1">
                    {duplicates.slice(0, 5).map(dup => (
                      <li key={dup.codigo}>
                        <code className="bg-destructive/20 px-1 rounded">{dup.codigo}</code>
                        {' '}nas linhas: {dup.lines.join(', ')}
                      </li>
                    ))}
                    {duplicates.length > 5 && (
                      <li className="text-muted-foreground">
                        ... e mais {duplicates.length - 5} duplicados
                      </li>
                    )}
                  </ul>
                  <p className="mt-2 text-sm">Corrija o arquivo e tente novamente.</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary cards */}
            {summary && duplicates.length === 0 && (
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{summary.novos}</p>
                  <p className="text-xs text-muted-foreground">Novos</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{summary.updates}</p>
                  <p className="text-xs text-muted-foreground">Atualizações</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{summary.iguais}</p>
                  <p className="text-xs text-muted-foreground">Iguais</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{summary.erros}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            )}

            {/* Tabs for filtering */}
            {duplicates.length === 0 && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-fit">
                  <TabsTrigger value="all">Todos ({preview.length})</TabsTrigger>
                  <TabsTrigger value="novo">Novos ({summary?.novos || 0})</TabsTrigger>
                  <TabsTrigger value="update">Atualizações ({summary?.updates || 0})</TabsTrigger>
                  <TabsTrigger value="igual">Iguais ({summary?.iguais || 0})</TabsTrigger>
                  <TabsTrigger value="erro">Erros ({summary?.erros || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="flex-1 min-h-0 mt-4">
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead className="w-20">Status</TableHead>
                          <TableHead className="w-28">Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-16">Un</TableHead>
                          <TableHead className="w-32 text-right">Preço</TableHead>
                          <TableHead className="w-24">Mensagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPreview.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                            <TableCell>{getStatusBadge(row.status)}</TableCell>
                            <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{row.descricao}</TableCell>
                            <TableCell>{row.unidade}</TableCell>
                            <TableCell className="text-right">
                              {row.status === 'UPDATE_PRECO' ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-muted-foreground line-through text-xs">
                                    {formatCurrency(row.existingPreco ?? 0)}
                                  </span>
                                  <span className="text-blue-600 font-medium">
                                    {formatCurrency(row.preco_ref ?? 0)}
                                  </span>
                                </div>
                              ) : (
                                formatCurrency(row.preco_ref ?? 0)
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.errorMessage}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}

            {/* Full update option (super admin only) */}
            {canFullUpdate && summary && summary.updates > 0 && duplicates.length === 0 && (
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="fullUpdate"
                  checked={fullUpdate}
                  onCheckedChange={(checked) => setFullUpdate(checked === true)}
                />
                <Label htmlFor="fullUpdate" className="text-sm">
                  Atualização completa (incluir descrição, unidade, HH e categoria)
                </Label>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={50} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">Processando...</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={
                    isProcessing || 
                    duplicates.length > 0 || 
                    (summary?.erros ?? 0) > 0 ||
                    ((summary?.novos ?? 0) + (summary?.updates ?? 0)) === 0
                  }
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aplicar Importação
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
