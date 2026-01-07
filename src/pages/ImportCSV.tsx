import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateCPF, cleanCPF } from '@/lib/cpf';
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface PreviewRow {
  row: number;
  data: {
    full_name: string;
    cpf: string;
    birth_date: string;
    hire_date: string;
    termination_date: string;
    position: string;
    department: string;
    status: string;
    email: string;
    phone: string;
  };
  errors: string[];
  valid: boolean;
}

export default function ImportCSV() {
  const navigate = useNavigate();
  const { user, loading, hasRole } = useAuth();
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAccess = hasRole('admin') || hasRole('rh');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter((line) => line.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const validateRow = (row: Record<string, string>, rowNum: number): PreviewRow => {
    const errors: string[] = [];

    const data = {
      full_name: row['nome'] || row['nome_completo'] || row['full_name'] || '',
      cpf: row['cpf'] || '',
      birth_date: row['nascimento'] || row['data_nascimento'] || row['birth_date'] || '',
      hire_date: row['admissao'] || row['data_admissao'] || row['hire_date'] || '',
      termination_date: row['desligamento'] || row['data_desligamento'] || row['termination_date'] || '',
      position: row['cargo'] || row['position'] || '',
      department: row['departamento'] || row['department'] || '',
      status: row['status'] || 'ativo',
      email: row['email'] || '',
      phone: row['telefone'] || row['phone'] || '',
    };

    if (!data.full_name) {
      errors.push('Nome obrigatório');
    }

    const cleanedCPF = cleanCPF(data.cpf);
    if (!cleanedCPF) {
      errors.push('CPF obrigatório');
    } else if (!validateCPF(cleanedCPF)) {
      errors.push('CPF inválido');
    }
    data.cpf = cleanedCPF;

    if (!data.hire_date) {
      errors.push('Data de admissão obrigatória');
    }

    const validStatus = ['ativo', 'afastado', 'desligado'];
    if (data.status && !validStatus.includes(data.status.toLowerCase())) {
      data.status = 'ativo';
    } else {
      data.status = data.status.toLowerCase();
    }

    return {
      row: rowNum,
      data,
      errors,
      valid: errors.length === 0,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length < 2) {
        toast.error('Arquivo deve conter cabeçalho e pelo menos uma linha de dados');
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
      const dataRows = rows.slice(1);

      const previewData = dataRows.map((row, index) => {
        const rowObj: Record<string, string> = {};
        headers.forEach((header, i) => {
          rowObj[header] = row[i] || '';
        });
        return validateRow(rowObj, index + 2);
      });

      setPreview(previewData);
      setImported(false);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = preview.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }

    setImporting(true);
    let success = 0;
    let errors = 0;

    for (const row of validRows) {
      const { error } = await supabase.from('collaborators').insert({
        full_name: row.data.full_name,
        cpf: row.data.cpf,
        birth_date: row.data.birth_date || null,
        hire_date: row.data.hire_date,
        termination_date: row.data.termination_date || null,
        position: row.data.position || null,
        department: row.data.department || null,
        status: row.data.status as 'ativo' | 'afastado' | 'desligado',
        email: row.data.email || null,
        phone: row.data.phone || null,
        created_by: user?.id,
        updated_by: user?.id,
      });

      if (error) {
        errors++;
      } else {
        success++;
      }
    }

    setResults({ success, errors });
    setImported(true);
    setImporting(false);

    if (success > 0) {
      toast.success(`${success} colaborador(es) importado(s) com sucesso!`);
    }
    if (errors > 0) {
      toast.error(`${errors} registro(s) com erro (CPF duplicado?)`);
    }
  };

  const handleReset = () => {
    setPreview([]);
    setImported(false);
    setResults({ success: 0, errors: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para importar dados.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Importar CSV</h2>
          <p className="text-muted-foreground">Importe colaboradores a partir de um arquivo CSV</p>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formato do Arquivo</CardTitle>
            <CardDescription>
              O arquivo CSV deve conter as seguintes colunas (a primeira linha deve ser o cabeçalho):
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Obrigatórias:</strong> nome (ou nome_completo), cpf, admissao (ou data_admissao)</p>
              <p><strong>Opcionais:</strong> nascimento, desligamento, cargo, departamento, status, email, telefone</p>
              <p><strong>Status válidos:</strong> ativo, afastado, desligado (padrão: ativo)</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um arquivo CSV ou Excel
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {preview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {preview.filter((r) => r.valid).length} de {preview.length} registros válidos
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Limpar
                </Button>
                {!imported && (
                  <Button
                    onClick={handleImport}
                    disabled={importing || preview.filter((r) => r.valid).length === 0}
                  >
                    {importing ? 'Importando...' : 'Importar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {imported && (
                <div className="mb-4 p-4 rounded-lg bg-muted flex items-center gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Importação concluída</p>
                    <p className="text-sm text-muted-foreground">
                      {results.success} sucesso, {results.errors} erros
                    </p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Admissão</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 50).map((row) => (
                      <TableRow key={row.row} className={!row.valid ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {row.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            {row.row}
                          </div>
                        </TableCell>
                        <TableCell>{row.data.full_name || '-'}</TableCell>
                        <TableCell>{row.data.cpf || '-'}</TableCell>
                        <TableCell>{row.data.hire_date || '-'}</TableCell>
                        <TableCell>{row.data.department || '-'}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge variant="outline">{row.data.status}</Badge>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {row.errors.join(', ')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Mostrando 50 de {preview.length} registros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
