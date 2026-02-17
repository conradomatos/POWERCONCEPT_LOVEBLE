import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  Upload, 
  Download, 
  MoreHorizontal, 
  Trash2, 
  Edit,
  FolderTree,
  X,
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  Equal,
  Copy,
  Send,
  Inbox,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useEquipmentCatalogRequests } from '@/hooks/orcamentos/useEquipmentCatalogRequests';
import { EquipmentRequestModal } from '@/components/orcamentos/bases/EquipmentRequestModal';
import { EquipmentRequestsList } from '@/components/orcamentos/bases/EquipmentRequestsList';
import { 
  useEquipmentCatalogNew, 
  useEquipmentGroups, 
  useEquipmentCategories, 
  useEquipmentSubcategories,
  type EquipmentCatalogItem 
} from '@/hooks/orcamentos/useEquipmentCatalogNew';
import { useEquipmentCatalogImport, type ImportPreviewRow } from '@/hooks/orcamentos/useEquipmentCatalogImport';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CatalogoEquipamentos() {
  const { items, isLoading, canEdit, createItem, updateItem, deleteItem } = useEquipmentCatalogNew();
  const { groups } = useEquipmentGroups();
  const { categories } = useEquipmentCategories();
  const { subcategories } = useEquipmentSubcategories();
  const importHook = useEquipmentCatalogImport();
  const { pendingCount, isCatalogManager } = useEquipmentCatalogRequests();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [hierarchyDialogOpen, setHierarchyDialogOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestsListOpen, setRequestsListOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    unidade: 'dia',
    preco_mensal_ref: 0,
    group_id: '',
    category_id: '',
    subcategory_id: '',
    observacao: '',
  });
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    codigo?: string;
    descricao?: string;
    group_id?: string;
    category_id?: string;
  }>({});
  
  // Validation constants
  const UNIDADE_OPTIONS = ['hora', 'dia', 'mês', 'ano'] as const;
  
  // Validate codigo format: 3-20 chars, A-Z0-9 and hyphen, no start/end hyphen, no double hyphen
  const validateCodigo = (codigo: string): string | undefined => {
    if (!codigo) return 'Código é obrigatório';
    if (codigo.length < 3) return 'Mínimo 3 caracteres';
    if (codigo.length > 20) return 'Máximo 20 caracteres';
    if (!/^[A-Z0-9-]+$/.test(codigo)) return 'Apenas A-Z, 0-9 e hífen permitidos';
    if (codigo.startsWith('-') || codigo.endsWith('-')) return 'Não pode começar/terminar com hífen';
    if (codigo.includes('--')) return 'Não pode conter hífen duplo (--)';
    return undefined;
  };
  
  // Validate descricao: 10-160 chars
  const validateDescricao = (descricao: string): string | undefined => {
    if (!descricao) return 'Descrição é obrigatória';
    if (descricao.length < 10) return `Mínimo 10 caracteres (atual: ${descricao.length})`;
    if (descricao.length > 160) return `Máximo 160 caracteres (atual: ${descricao.length})`;
    return undefined;
  };
  
  // Real-time validation on codigo change
  const handleCodigoChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setFormData({ ...formData, codigo: upperValue });
    const error = validateCodigo(upperValue);
    setFormErrors(prev => ({ ...prev, codigo: error }));
  };
  
  // Real-time validation on descricao change
  const handleDescricaoChange = (value: string) => {
    setFormData({ ...formData, descricao: value });
    const error = validateDescricao(value);
    setFormErrors(prev => ({ ...prev, descricao: error }));
  };
  
  // Check if hierarchy exists
  const hasHierarchy = groups.length > 0;
  
  // Inline editing
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Import
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
  const [importFileName, setImportFileName] = useState('');
  const [fullUpdate, setFullUpdate] = useState(false);
  
  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchTerm && 
          !item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !item.descricao.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterGroup !== 'all' && item.group_id !== filterGroup) return false;
      if (filterCategory !== 'all' && item.category_id !== filterCategory) return false;
      if (filterAtivo === 'ativo' && !item.ativo) return false;
      if (filterAtivo === 'inativo' && item.ativo) return false;
      return true;
    });
  }, [items, searchTerm, filterGroup, filterCategory, filterAtivo]);
  
  // Filtered categories based on selected group
  const filteredCategories = useMemo(() => {
    if (filterGroup === 'all') return categories;
    return categories.filter(c => c.group_id === filterGroup);
  }, [categories, filterGroup]);
  
  // Form categories based on selected group
  const formCategories = useMemo(() => {
    if (!formData.group_id) return [];
    return categories.filter(c => c.group_id === formData.group_id);
  }, [categories, formData.group_id]);
  
  // Form subcategories based on selected category
  const formSubcategories = useMemo(() => {
    if (!formData.category_id) return [];
    return subcategories.filter(s => s.category_id === formData.category_id);
  }, [subcategories, formData.category_id]);
  
  // Handle create with full validation
  const handleCreate = async () => {
    // Validate all fields
    const codigoError = validateCodigo(formData.codigo);
    const descricaoError = validateDescricao(formData.descricao);
    const groupError = !formData.group_id ? 'Grupo é obrigatório' : undefined;
    const categoryError = !formData.category_id ? 'Categoria é obrigatória' : undefined;
    
    const errors = {
      codigo: codigoError,
      descricao: descricaoError,
      group_id: groupError,
      category_id: categoryError,
    };
    
    setFormErrors(errors);
    
    // Check if any errors exist
    if (codigoError || descricaoError || groupError || categoryError) {
      toast.error('Corrija os erros no formulário');
      return;
    }
    
    try {
      await createItem.mutateAsync({
        codigo: formData.codigo,
        descricao: formData.descricao,
        unidade: formData.unidade || 'dia',
        preco_mensal_ref: formData.preco_mensal_ref,
        group_id: formData.group_id || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        observacao: formData.observacao || null,
      });
      
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation onError
    }
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      unidade: 'dia',
      preco_mensal_ref: 0,
      group_id: '',
      category_id: '',
      subcategory_id: '',
      observacao: '',
    });
    setFormErrors({});
  };
  
  // Inline editing handlers
  const startEditing = (id: string, field: string, currentValue: unknown) => {
    if (!canEdit) return;
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
  };
  
  const saveEdit = useCallback(async () => {
    if (!editingCell) return;
    
    const { id, field } = editingCell;
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    let value: string | number | boolean = editValue;
    
    if (field === 'preco_mensal_ref') {
      value = parseFloat(editValue.replace(',', '.')) || 0;
    }
    
    if (String(item[field as keyof EquipmentCatalogItem]) !== String(value)) {
      await updateItem.mutateAsync({ id, [field]: value });
    }
    
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, items, updateItem]);
  
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };
  
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveEdit();
      
      const fields = ['codigo', 'descricao', 'unidade', 'preco_mensal_ref'];
      const currentFieldIndex = fields.indexOf(field);
      
      if (e.shiftKey) {
        if (currentFieldIndex > 0) {
          const prevField = fields[currentFieldIndex - 1];
          const item = filteredItems[rowIndex];
          startEditing(id, prevField, item[prevField as keyof EquipmentCatalogItem]);
        } else if (rowIndex > 0) {
          const prevItem = filteredItems[rowIndex - 1];
          startEditing(prevItem.id, 'preco_mensal_ref', prevItem.preco_mensal_ref);
        }
      } else {
        if (currentFieldIndex < fields.length - 1) {
          const nextField = fields[currentFieldIndex + 1];
          const item = filteredItems[rowIndex];
          startEditing(id, nextField, item[nextField as keyof EquipmentCatalogItem]);
        } else if (rowIndex < filteredItems.length - 1) {
          const nextItem = filteredItems[rowIndex + 1];
          startEditing(nextItem.id, 'codigo', nextItem.codigo);
        }
      }
    }
  };
  
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);
  
  // Import handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFileName(file.name);
    await importHook.processFile(file);
    setImportStep('preview');
  };
  
  const handleApplyImport = async () => {
    await importHook.applyImport(fullUpdate, importFileName);
    setImportDialogOpen(false);
    setImportStep('upload');
    setImportFileName('');
    importHook.reset();
  };
  
  const closeImportDialog = () => {
    setImportDialogOpen(false);
    setImportStep('upload');
    setImportFileName('');
    importHook.reset();
  };
  
  const getStatusBadge = (status: ImportPreviewRow['status']) => {
    switch (status) {
      case 'NOVO':
        return <Badge className="bg-green-500"><Plus className="h-3 w-3 mr-1" />Novo</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-500"><Edit className="h-3 w-3 mr-1" />Atualizar</Badge>;
      case 'IGUAL':
        return <Badge variant="secondary"><Equal className="h-3 w-3 mr-1" />Igual</Badge>;
      case 'ERRO':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'DUPLICADO':
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><Copy className="h-3 w-3 mr-1" />Duplicado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando catálogo...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Equipamentos</h1>
          <p className="text-muted-foreground">
            Base global de equipamentos para locação. {items.length} itens cadastrados.
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Master/Catalog Manager actions */}
          {canEdit && (
            <>
              {isCatalogManager && pendingCount > 0 && (
                <Button variant="outline" onClick={() => setRequestsListOpen(true)}>
                  <Inbox className="h-4 w-4 mr-2" />
                  Solicitações
                  <Badge className="ml-2 bg-primary text-primary-foreground">{pendingCount}</Badge>
                </Button>
              )}
              <Button variant="outline" onClick={() => setHierarchyDialogOpen(true)}>
                <FolderTree className="h-4 w-4 mr-2" />
                Hierarquia
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Equipamento
              </Button>
            </>
          )}
          
          {/* Non-master user actions */}
          {!canEdit && (
            <>
              <Button variant="outline" onClick={() => setRequestsListOpen(true)}>
                <Inbox className="h-4 w-4 mr-2" />
                Minhas Solicitações
              </Button>
              <Button onClick={() => setRequestModalOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Solicitar Inclusão
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filterGroup} onValueChange={(v) => { setFilterGroup(v); setFilterCategory('all'); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {filteredCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterAtivo} onValueChange={setFilterAtivo}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            
            {(searchTerm || filterGroup !== 'all' || filterCategory !== 'all' || filterAtivo !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterGroup('all');
                  setFilterCategory('all');
                  setFilterAtivo('all');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Table */}
      <Card>
        <ScrollArea className="h-[calc(100vh-300px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead className="min-w-[250px]">Descrição</TableHead>
                <TableHead className="w-[80px]">Unidade</TableHead>
                <TableHead className="w-[140px] text-right">Preço Mensal Ref.</TableHead>
                <TableHead className="w-[200px]">Hierarquia</TableHead>
                <TableHead className="w-[80px] text-center">Status</TableHead>
                {canEdit && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterGroup !== 'all' || filterCategory !== 'all' 
                      ? 'Nenhum equipamento encontrado com os filtros aplicados'
                      : 'Nenhum equipamento cadastrado. Clique em "Novo Equipamento" para começar.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, rowIndex) => (
                  <TableRow key={item.id} className="group">
                    {/* Código */}
                    <TableCell 
                      className={cn("font-mono", canEdit && "cursor-pointer hover:bg-muted/50")}
                      onDoubleClick={() => startEditing(item.id, 'codigo', item.codigo)}
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'codigo' ? (
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'codigo', rowIndex)}
                          className="h-7 text-xs"
                        />
                      ) : (
                        item.codigo
                      )}
                    </TableCell>
                    
                    {/* Descrição */}
                    <TableCell 
                      className={cn(canEdit && "cursor-pointer hover:bg-muted/50")}
                      onDoubleClick={() => startEditing(item.id, 'descricao', item.descricao)}
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'descricao' ? (
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'descricao', rowIndex)}
                          className="h-7"
                        />
                      ) : (
                        item.descricao
                      )}
                    </TableCell>
                    
                    {/* Unidade */}
                    <TableCell 
                      className={cn("text-center", canEdit && "cursor-pointer hover:bg-muted/50")}
                      onDoubleClick={() => startEditing(item.id, 'unidade', item.unidade)}
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'unidade' ? (
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'unidade', rowIndex)}
                          className="h-7 text-xs text-center"
                        />
                      ) : (
                        item.unidade
                      )}
                    </TableCell>
                    
                    {/* Preço */}
                    <TableCell 
                      className={cn("text-right font-mono", canEdit && "cursor-pointer hover:bg-muted/50")}
                      onDoubleClick={() => startEditing(item.id, 'preco_mensal_ref', item.preco_mensal_ref)}
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'preco_mensal_ref' ? (
                        <Input
                          ref={inputRef}
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => handleKeyDown(e, item.id, 'preco_mensal_ref', rowIndex)}
                          className="h-7 text-right"
                        />
                      ) : (
                        formatCurrency(item.preco_mensal_ref)
                      )}
                    </TableCell>
                    
                    {/* Hierarquia */}
                    <TableCell className="text-sm text-muted-foreground">
                      {item.hierarquia_path || '-'}
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell className="text-center">
                      <Badge variant={item.ativo ? 'default' : 'secondary'}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    
                    {/* Actions */}
                    {canEdit && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateItem.mutate({ id: item.id, ativo: !item.ativo })}>
                              {item.ativo ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteItem.mutate(item.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
      
      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { 
        if (!open) resetForm();
        setCreateDialogOpen(open); 
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Equipamento</DialogTitle>
          </DialogHeader>
          
          {/* Warning if no hierarchy exists */}
          {!hasHierarchy && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cadastre a hierarquia (Grupo/Categoria) antes de criar equipamentos.
                <Button 
                  variant="link" 
                  className="p-0 h-auto ml-1"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setHierarchyDialogOpen(true);
                  }}
                >
                  Gerenciar Hierarquia
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            {/* Código and Unidade row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => handleCodigoChange(e.target.value)}
                  placeholder="EQ-001"
                  className={cn(formErrors.codigo && "border-destructive")}
                  maxLength={20}
                />
                {formErrors.codigo ? (
                  <p className="text-xs text-destructive">{formErrors.codigo}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">3-20 caracteres: A-Z, 0-9, hífen</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Unidade <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.unidade} 
                  onValueChange={(v) => setFormData({ ...formData, unidade: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADE_OPTIONS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Descrição */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Descrição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => handleDescricaoChange(e.target.value)}
                placeholder="Tipo + capacidade + tensão + observação curta. Ex: Gerador trifásico 40kVA 220/127V (não silenciado)"
                className={cn("min-h-[60px]", formErrors.descricao && "border-destructive")}
                maxLength={160}
              />
              {formErrors.descricao ? (
                <p className="text-xs text-destructive">{formErrors.descricao}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formData.descricao.length}/160 caracteres (mínimo 10)
                </p>
              )}
            </div>
            
            {/* Preço */}
            <div className="space-y-2">
              <Label>Preço Referência</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_mensal_ref || ''}
                onChange={(e) => setFormData({ ...formData, preco_mensal_ref: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
              />
            </div>
            
            {/* Hierarchy section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Hierarquia</Label>
                {canEdit && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-1 text-xs"
                    onClick={() => {
                      setCreateDialogOpen(false);
                      setHierarchyDialogOpen(true);
                    }}
                  >
                    <FolderTree className="h-3 w-3 mr-1" />
                    Gerenciar
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    Grupo <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={formData.group_id} 
                    onValueChange={(v) => {
                      setFormData({ ...formData, group_id: v, category_id: '', subcategory_id: '' });
                      setFormErrors(prev => ({ ...prev, group_id: undefined }));
                    }}
                  >
                    <SelectTrigger className={cn(formErrors.group_id && "border-destructive")}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(v) => {
                      setFormData({ ...formData, category_id: v, subcategory_id: '' });
                      setFormErrors(prev => ({ ...prev, category_id: undefined }));
                    }}
                    disabled={!formData.group_id}
                  >
                    <SelectTrigger className={cn(formErrors.category_id && "border-destructive")}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {formCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subcategoria</Label>
                  <Select 
                    value={formData.subcategory_id} 
                    onValueChange={(v) => setFormData({ ...formData, subcategory_id: v })}
                    disabled={!formData.category_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="(opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {formSubcategories.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(formErrors.group_id || formErrors.category_id) && (
                <p className="text-xs text-destructive">Grupo e Categoria são obrigatórios</p>
              )}
            </div>
            
            {/* Notas internas (former Observação) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Notas internas
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Textarea
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Informações internas sobre o equipamento (não visível em propostas)"
                className="min-h-[40px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createItem.isPending || !hasHierarchy}
            >
              {createItem.isPending ? 'Salvando...' : 'Criar Equipamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) closeImportDialog(); else setImportDialogOpen(true); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Catálogo de Equipamentos
            </DialogTitle>
          </DialogHeader>
          
          {importStep === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Arraste um arquivo Excel (.xlsx) ou CSV aqui, ou clique para selecionar
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => importHook.downloadTemplate()}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Colunas suportadas:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>codigo</strong> (obrigatório): Código único do equipamento</li>
                  <li><strong>descricao</strong> (obrigatório): Descrição do equipamento</li>
                  <li><strong>unidade</strong>: Unidade de locação (padrão: mês)</li>
                  <li><strong>preco_mensal_ref</strong>: Preço mensal de referência</li>
                  <li><strong>hierarquia_path</strong>: Caminho hierárquico (ex: "Geradores / 100 kVA")</li>
                  <li><strong>tags</strong>: Tags separadas por ;</li>
                  <li><strong>observacao</strong>: Observações</li>
                </ul>
              </div>
            </div>
          )}
          
          {importStep === 'preview' && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Arquivo: <strong>{importFileName}</strong>
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setImportStep('upload'); importHook.reset(); }}>
                  <X className="h-4 w-4 mr-1" />
                  Escolher outro
                </Button>
              </div>
              
              {/* Summary */}
              {importHook.summary && (
                <div className="grid grid-cols-5 gap-2">
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{importHook.summary.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </Card>
                  <Card className="p-3 text-center border-green-500/50">
                    <p className="text-2xl font-bold text-green-600">{importHook.summary.novos}</p>
                    <p className="text-xs text-muted-foreground">Novos</p>
                  </Card>
                  <Card className="p-3 text-center border-blue-500/50">
                    <p className="text-2xl font-bold text-blue-600">{importHook.summary.updates}</p>
                    <p className="text-xs text-muted-foreground">Atualizar</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{importHook.summary.iguais}</p>
                    <p className="text-xs text-muted-foreground">Iguais</p>
                  </Card>
                  <Card className="p-3 text-center border-destructive/50">
                    <p className="text-2xl font-bold text-destructive">{importHook.summary.erros + importHook.summary.duplicados}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </Card>
                </div>
              )}
              
              {importHook.duplicates.length > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Códigos duplicados no arquivo
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-300">
                      {importHook.duplicates.slice(0, 5).join(', ')}
                      {importHook.duplicates.length > 5 && ` e mais ${importHook.duplicates.length - 5}...`}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Preview table */}
              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead>Hierarquia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHook.preview.slice(0, 100).map((row) => (
                      <TableRow key={row.rowIndex} className={cn(
                        row.status === 'ERRO' && 'bg-destructive/10',
                        row.status === 'DUPLICADO' && 'bg-orange-50 dark:bg-orange-950/30'
                      )}>
                        <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                        <TableCell className="font-mono">{row.codigo || '-'}</TableCell>
                        <TableCell>{row.descricao || '-'}</TableCell>
                        <TableCell>{row.unidade}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.preco_mensal_ref)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[row.grupo, row.categoria, row.subcategoria].filter(Boolean).join(' / ') || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {importHook.preview.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          ... e mais {importHook.preview.length - 100} linhas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              {/* Full update option */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Switch
                  id="fullUpdate"
                  checked={fullUpdate}
                  onCheckedChange={setFullUpdate}
                />
                <Label htmlFor="fullUpdate" className="text-sm">
                  Atualizar também itens sem alterações (força re-gravação de todos)
                </Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog}>Cancelar</Button>
            {importStep === 'preview' && (
              <Button 
                onClick={handleApplyImport} 
                disabled={importHook.isProcessing || !importHook.summary || importHook.summary.novos + importHook.summary.updates === 0}
              >
                {importHook.isProcessing ? 'Importando...' : 'Aplicar Importação'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hierarchy Dialog (placeholder - can be expanded later) */}
      <Dialog open={hierarchyDialogOpen} onOpenChange={setHierarchyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Hierarquia</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Funcionalidade de gerenciamento de grupos, categorias e subcategorias.</p>
            <p className="text-sm">Você pode criar hierarquias via importação ou manualmente expandir este componente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHierarchyDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Request Modal for non-master users */}
      <EquipmentRequestModal 
        open={requestModalOpen} 
        onOpenChange={setRequestModalOpen} 
      />
      
      {/* Requests List for viewing/managing requests */}
      <EquipmentRequestsList 
        open={requestsListOpen} 
        onOpenChange={setRequestsListOpen} 
      />
    </div>
  );
}
