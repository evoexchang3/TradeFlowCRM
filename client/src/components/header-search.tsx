import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";

export function HeaderSearch() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const res = await apiRequest('POST', '/api/clients/search', {
        query: searchQuery,
        page: 1,
        limit: 5
      });
      const data = await res.json();
      return data.clients || [];
    },
  });

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      setIsOpen(true);
      searchMutation.mutate(value.trim());
    } else {
      setIsOpen(false);
    }
  };

  const handleClientClick = (clientId: number) => {
    setLocation(`/clients/${clientId}`);
    setQuery("");
    setIsOpen(false);
  };

  const handleViewAll = () => {
    setLocation(`/search/global?query=${encodeURIComponent(query)}`);
    setQuery("");
    setIsOpen(false);
  };

  const results = searchMutation.data || [];

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('search.quick.placeholder')}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          className="pl-9 pr-4"
          data-testid="input-header-search"
        />
        {searchMutation.isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-auto">
          {searchMutation.isPending ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('common.searching')}
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="py-1">
                {results.map((client: Client) => (
                  <button
                    key={client.id}
                    onClick={() => handleClientClick(client.id as any)}
                    className="w-full px-4 py-2 text-left hover-elevate active-elevate-2 flex items-center justify-between"
                    data-testid={`result-client-${client.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {client.firstName} {client.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {client.email}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t">
                <button
                  onClick={handleViewAll}
                  className="w-full px-4 py-2 text-sm text-primary hover-elevate active-elevate-2 text-center"
                  data-testid="button-view-all-results"
                >
                  {t('search.view.all.results')} "{query}"
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('search.no.clients')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
