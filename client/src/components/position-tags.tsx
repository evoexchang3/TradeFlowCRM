import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Check } from "lucide-react";
import type { PositionTag } from "@shared/schema";

interface PositionTagsProps {
  positionId: string;
}

export function PositionTags({ positionId }: PositionTagsProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: allTags = [] } = useQuery<PositionTag[]>({
    queryKey: ["/api/position-tags"],
  });

  const { data: positionTags = [], isLoading } = useQuery<PositionTag[]>({
    queryKey: [`/api/positions/${positionId}/tags`],
  });

  const assignMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await apiRequest("POST", `/api/positions/${positionId}/tags`, { tagId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/positions/${positionId}/tags`] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({ title: "Tag assigned successfully" });
      setOpen(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("already assigned")) {
        toast({
          title: "Tag already assigned",
          description: "This tag is already assigned to this position",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to assign tag",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await apiRequest("DELETE", `/api/positions/${positionId}/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/positions/${positionId}/tags`] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({ title: "Tag removed successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const positionTagIds = new Set(positionTags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !positionTagIds.has(tag.id));

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Loading...</span>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid={`position-tags-${positionId}`}>
      {positionTags.map((tag) => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.color }}
          className="text-white flex items-center gap-1 pr-1"
          data-testid={`badge-position-tag-${tag.id}`}
        >
          {tag.name}
          <button
            onClick={() => removeMutation.mutate(tag.id)}
            className="ml-1 hover:bg-black/20 rounded-sm p-0.5"
            disabled={removeMutation.isPending}
            data-testid={`button-remove-tag-${tag.id}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2"
            data-testid={`button-add-tag-${positionId}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." data-testid={`input-search-tags-${positionId}`} />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => assignMutation.mutate(tag.id)}
                    data-testid={`command-item-tag-${tag.id}`}
                  >
                    <Badge
                      style={{ backgroundColor: tag.color }}
                      className="text-white mr-2"
                    >
                      {tag.name}
                    </Badge>
                    {tag.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {tag.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
