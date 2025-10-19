import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { SUPPORTED_LANGUAGES } from "@/translations";

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language);

  const europeanLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    ['en', 'es', 'de', 'fr', 'it', 'pt', 'ru', 'pl', 'nl', 'sv', 
     'bg', 'cs', 'da', 'et', 'fi', 'el', 'hu', 'lv', 'lt', 'nb', 
     'ro', 'sk', 'sl'].includes(lang.code)
  );

  const asianLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    ['zh', 'ja', 'ko', 'hi', 'id'].includes(lang.code)
  );

  const middleEasternLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    ['ar', 'tr'].includes(lang.code)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-selector">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('common.select.language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ScrollArea className="h-[400px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            European
          </DropdownMenuLabel>
          {europeanLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={language === lang.code ? "bg-accent" : ""}
              data-testid={`menu-language-${lang.code}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Asian
          </DropdownMenuLabel>
          {asianLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={language === lang.code ? "bg-accent" : ""}
              data-testid={`menu-language-${lang.code}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Middle Eastern
          </DropdownMenuLabel>
          {middleEasternLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={language === lang.code ? "bg-accent" : ""}
              data-testid={`menu-language-${lang.code}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
