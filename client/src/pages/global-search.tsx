import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Filter, Save, Star, MoreVertical, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchFilters {
  searchQuery?: string;
  teamId?: string;
  agentId?: string;
  statusId?: string;
  kycStatus?: string;
  hasFTD?: string | boolean;
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  ftdDateFrom?: string;
  ftdDateTo?: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
  isDefault: boolean;
  createdAt: string;
}

export default function GlobalSearch() {
  const { t } = useLanguage();
  const [location, setLocationPath] = useLocation();
  const { toast } = useToast();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [urlQueryHandled, setUrlQueryHandled] = useState(false);

  // Load saved filters
  const { data: savedFilters = [] } = useQuery<SavedFilter[]>({
    queryKey: ['/api/saved-filters'],
  });

  // Handle URL query parameter from header search
  useEffect(() => {
    if (urlQueryHandled) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('query');
    
    if (queryParam) {
      setFilters({ searchQuery: queryParam });
      setUrlQueryHandled(true);
      // Trigger search with query from URL
      searchMutation.mutate({ filters: { searchQuery: queryParam }, page: 1 });
    }
  }, [location, urlQueryHandled]);

  // Load default filter on mount and auto-search (only if no URL query)
  useEffect(() => {
    if (urlQueryHandled) return;
    
    const defaultFilter = savedFilters.find(f => f.isDefault);
    if (defaultFilter && Object.keys(filters).length === 0) {
      setFilters(defaultFilter.filters);
      // Auto-trigger search with default filter
      searchMutation.mutate({ filters: defaultFilter.filters, page: 1 });
      setUrlQueryHandled(true);
    }
  }, [savedFilters, urlQueryHandled]);

  // Load filter options
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ['/api/users/agents'],
  });

  const { data: customStatuses = [] } = useQuery<any[]>({
    queryKey: ['/api/custom-statuses'],
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async ({ filters: searchFilters, page: searchPage }: { filters: SearchFilters, page: number }) => {
      const res = await apiRequest('POST', '/api/clients/search', { ...searchFilters, page: searchPage, limit });
      return await res.json();
    },
  });

  // Save filter mutation
  const saveFilterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/saved-filters', {
        name: filterName,
        filters,
        isDefault: setAsDefault,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-filters'] });
      setSaveDialogOpen(false);
      setFilterName("");
      setSetAsDefault(false);
      toast({ title: t('search.filter.saved') });
    },
  });

  // Delete filter mutation
  const deleteFilterMutation = useMutation({
    mutationFn: async (filterId: string) => {
      const res = await apiRequest('DELETE', `/api/saved-filters/${filterId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-filters'] });
      toast({ title: t('search.filter.deleted') });
    },
  });

  // Set default filter mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (filterId: string) => {
      const res = await apiRequest('PATCH', `/api/saved-filters/${filterId}/set-default`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-filters'] });
      toast({ title: t('search.filter.updated') });
    },
  });

  const handleExportCSV = async () => {
    if (!clients || clients.length === 0) {
      toast({ title: t('search.no.results'), variant: "destructive" });
      return;
    }

    try {
      // Fetch ALL filtered results (not just current page)
      const res = await apiRequest('POST', '/api/clients/search', { ...filters, page: 1, limit: 999999 });
      const allResults = await res.json();
      const allClients = allResults?.clients || [];

      if (allClients.length === 0) {
        toast({ title: t('search.no.results'), variant: "destructive" });
        return;
      }

      // Prepare CSV data
      const headers = [
        t('common.name'),
        t('common.email'),
        t('common.phone'),
        t('search.team'),
        t('search.agent'),
        t('search.custom.status'),
        t('search.kyc.status'),
        t('search.ftd.status'),
        t('search.registration.date'),
      ];

      const rows = allClients.map((client: any) => [
        client.name || '',
        client.email || '',
        client.phone || '',
        client.team?.name || '',
        client.assignedAgent?.name || '',
        client.customStatus?.name || '',
        client.kycStatus || '',
        client.hasFTD ? t('common.yes') : t('common.no'),
        client.createdAt ? new Date(client.createdAt).toLocaleString() : '',
      ]);

      // Escape CSV values (handle commas, quotes, newlines)
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      // Build CSV content
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map((row: string[]) => row.map(escapeCSV).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clients_search_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: t('search.exported', { count: allClients.length }) });
    } catch (error: any) {
      console.error('[Export CSV Error]:', error);
      toast({ title: t('toast.error.failed'), variant: "destructive" });
    }
  };

  const handleSearch = () => {
    setPage(1);
    searchMutation.mutate({ filters, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
    setUrlQueryHandled(false);
    // Clear URL query parameter
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setPage(1);
    searchMutation.mutate({ filters: savedFilter.filters, page: 1 });
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({ title: t('search.filter.name.required'), variant: "destructive" });
      return;
    }
    saveFilterMutation.mutate();
  };

  const results = searchMutation.data;
  const clients = results?.clients || [];
  const pagination = results?.pagination;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Search className="h-6 w-6" />
          {t('search.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('search.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t('search.saved.filters')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.map((savedFilter) => (
                    <div key={savedFilter.id} className="flex items-center gap-1 bg-muted rounded-md px-3 py-1.5">
                      {savedFilter.isDefault && <Star className="h-3 w-3 fill-primary text-primary" />}
                      <button
                        onClick={() => handleLoadFilter(savedFilter)}
                        className="text-sm hover:text-primary"
                        data-testid={`button-load-filter-${savedFilter.id}`}
                      >
                        {savedFilter.name}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5" data-testid={`button-filter-menu-${savedFilter.id}`}>
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {!savedFilter.isDefault && (
                            <DropdownMenuItem onClick={() => setDefaultMutation.mutate(savedFilter.id)}>
                              {t('search.set.as.default')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteFilterMutation.mutate(savedFilter.id)}
                            className="text-destructive"
                          >
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t('search.advanced.filters')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Query */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.search')}</Label>
                  <Input
                    placeholder={t('search.placeholder')}
                    value={filters.searchQuery || ""}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    data-testid="input-search-query"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('search.team')}</Label>
                  <Select value={filters.teamId || "all"} onValueChange={(v) => setFilters({ ...filters, teamId: v })}>
                    <SelectTrigger data-testid="select-team">
                      <SelectValue placeholder={t('search.all.teams')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.all.teams')}</SelectItem>
                      <SelectItem value="unassigned">{t('search.unassigned')}</SelectItem>
                      {teams.map((team: any) => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('search.agent')}</Label>
                  <Select value={filters.agentId || "all"} onValueChange={(v) => setFilters({ ...filters, agentId: v })}>
                    <SelectTrigger data-testid="select-agent">
                      <SelectValue placeholder={t('search.all.agents')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.all.agents')}</SelectItem>
                      <SelectItem value="unassigned">{t('search.unassigned')}</SelectItem>
                      {agents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('search.custom.status')}</Label>
                  <Select value={filters.statusId || "all"} onValueChange={(v) => setFilters({ ...filters, statusId: v })}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder={t('search.all.statuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.all.statuses')}</SelectItem>
                      {customStatuses.map((status: any) => (
                        <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('search.kyc.status')}</Label>
                  <Select value={filters.kycStatus || "all"} onValueChange={(v) => setFilters({ ...filters, kycStatus: v })}>
                    <SelectTrigger data-testid="select-kyc">
                      <SelectValue placeholder={t('search.all.kyc.statuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.all.kyc.statuses')}</SelectItem>
                      <SelectItem value="pending">{t('search.kyc.pending')}</SelectItem>
                      <SelectItem value="verified">{t('search.kyc.verified')}</SelectItem>
                      <SelectItem value="rejected">{t('search.kyc.rejected')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('search.ftd.status')}</Label>
                  <Select
                    value={filters.hasFTD?.toString() || "all"}
                    onValueChange={(v) => setFilters({ ...filters, hasFTD: v === "all" ? undefined : v === "true" })}
                  >
                    <SelectTrigger data-testid="select-ftd">
                      <SelectValue placeholder={t('search.all.clients')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('search.all.clients')}</SelectItem>
                      <SelectItem value="true">{t('search.has.ftd')}</SelectItem>
                      <SelectItem value="false">{t('search.no.ftd')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('search.registration.from')}</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    data-testid="input-date-from"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('search.registration.to')}</Label>
                  <Input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    data-testid="input-date-to"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('search.ftd.from')}</Label>
                  <Input
                    type="date"
                    value={filters.ftdDateFrom || ""}
                    onChange={(e) => setFilters({ ...filters, ftdDateFrom: e.target.value })}
                    data-testid="input-ftd-date-from"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('search.ftd.to')}</Label>
                  <Input
                    type="date"
                    value={filters.ftdDateTo || ""}
                    onChange={(e) => setFilters({ ...filters, ftdDateTo: e.target.value })}
                    data-testid="input-ftd-date-to"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button onClick={handleSearch} data-testid="button-search" disabled={searchMutation.isPending}>
                  <Search className="h-4 w-4 mr-2" />
                  {t('common.search')}
                </Button>
                <Button variant="outline" onClick={handleClearFilters} data-testid="button-clear">
                  <X className="h-4 w-4 mr-2" />
                  {t('search.clear.filters')}
                </Button>
                <Button variant="outline" onClick={() => setSaveDialogOpen(true)} data-testid="button-save-filter">
                  <Save className="h-4 w-4 mr-2" />
                  {t('search.save.filter')}
                </Button>
                {clients.length > 0 && (
                  <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
                    <Download className="h-4 w-4 mr-2" />
                    {t('search.export.csv')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {searchMutation.isSuccess && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('search.results.count', { count: pagination?.total || 0 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{t('search.no.results')}</p>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('common.name')}</TableHead>
                            <TableHead>{t('common.email')}</TableHead>
                            <TableHead>{t('common.phone')}</TableHead>
                            <TableHead>{t('search.team')}</TableHead>
                            <TableHead>{t('search.agent')}</TableHead>
                            <TableHead>{t('search.kyc.status')}</TableHead>
                            <TableHead>{t('search.ftd.status')}</TableHead>
                            <TableHead>{t('common.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clients.map((client: any) => (
                            <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                              <TableCell className="font-medium">{client.name}</TableCell>
                              <TableCell className="text-muted-foreground">{client.email}</TableCell>
                              <TableCell className="text-muted-foreground">{client.phone}</TableCell>
                              <TableCell>{client.team?.name || "-"}</TableCell>
                              <TableCell>{client.assignedAgent?.name || "-"}</TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  client.kycStatus === 'verified' ? 'bg-green-500/20 text-green-500' :
                                  client.kycStatus === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                  'bg-yellow-500/20 text-yellow-500'
                                }`}>
                                  {client.kycStatus}
                                </span>
                              </TableCell>
                              <TableCell>
                                {client.hasFTD ? (
                                  <span className="text-green-500">✓</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLocationPath(`/clients/${client.id}`)}
                                  data-testid={`button-view-${client.id}`}
                                >
                                  {t('common.view')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          {t('search.page.of', { page: pagination.page, total: pagination.totalPages })}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPage = page - 1;
                              setPage(newPage);
                              searchMutation.mutate({ filters, page: newPage });
                            }}
                            disabled={page === 1}
                            data-testid="button-prev-page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPage = page + 1;
                              setPage(newPage);
                              searchMutation.mutate({ filters, page: newPage });
                            }}
                            disabled={page === pagination.totalPages}
                            data-testid="button-next-page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('search.save.preset')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('search.filter.name')}</Label>
              <Input
                placeholder={t('search.filter.name.placeholder')}
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                data-testid="input-filter-name"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="set-default"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                data-testid="checkbox-set-default"
              />
              <Label htmlFor="set-default" className="cursor-pointer">{t('search.set.default.filter')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} data-testid="button-cancel-save">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveFilter} disabled={saveFilterMutation.isPending} data-testid="button-confirm-save">
              {t('search.save.filter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
