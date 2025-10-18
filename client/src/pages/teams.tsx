import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, UsersRound, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

const EUROPEAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'cs', name: 'Czech (Čeština)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'hu', name: 'Hungarian (Magyar)' },
  { code: 'bg', name: 'Bulgarian (Български)' },
  { code: 'da', name: 'Danish (Dansk)' },
  { code: 'fi', name: 'Finnish (Suomi)' },
  { code: 'sk', name: 'Slovak (Slovenčina)' },
  { code: 'no', name: 'Norwegian (Norsk)' },
  { code: 'hr', name: 'Croatian (Hrvatski)' },
  { code: 'sr', name: 'Serbian (Српски)' },
  { code: 'cnr', name: 'Montenegrin (Crnogorski)' },
  { code: 'lt', name: 'Lithuanian (Lietuvių)' },
  { code: 'sl', name: 'Slovenian (Slovenščina)' },
  { code: 'lv', name: 'Latvian (Latviešu)' },
  { code: 'et', name: 'Estonian (Eesti)' },
  { code: 'ga', name: 'Irish (Gaeilge)' },
  { code: 'mt', name: 'Maltese (Malti)' },
  { code: 'sq', name: 'Albanian (Shqip)' },
  { code: 'mk', name: 'Macedonian (Македонски)' },
  { code: 'bs', name: 'Bosnian (Bosanski)' },
  { code: 'is', name: 'Icelandic (Íslenska)' },
  { code: 'lb', name: 'Luxembourgish (Lëtzebuergesch)' },
  { code: 'ca', name: 'Catalan (Català)' },
  { code: 'eu', name: 'Basque (Euskara)' },
  { code: 'gl', name: 'Galician (Galego)' },
  { code: 'cy', name: 'Welsh (Cymraeg)' },
  { code: 'be', name: 'Belarusian (Беларуская)' },
  { code: 'uk', name: 'Ukrainian (Українська)' },
  { code: 'fo', name: 'Faroese (Føroyskt)' },
  { code: 'rm', name: 'Romansh (Rumantsch)' },
  { code: 'gd', name: 'Scottish Gaelic (Gàidhlig)' },
  { code: 'br', name: 'Breton (Brezhoneg)' },
  { code: 'kw', name: 'Cornish (Kernewek)' },
  { code: 'gv', name: 'Manx (Gaelg)' },
  { code: 'hy', name: 'Armenian (Հայերեն)' },
  { code: 'ka', name: 'Georgian (ქართული)' },
  { code: 'az', name: 'Azerbaijani (Azərbaycan)' },
  { code: 'kk', name: 'Kazakh (Қазақша)' },
  { code: 'oc', name: 'Occitan (Occitan)' },
  { code: 'sc', name: 'Sardinian (Sardu)' },
  { code: 'co', name: 'Corsican (Corsu)' },
  { code: 'fur', name: 'Friulian (Furlan)' },
  { code: 'hsb', name: 'Upper Sorbian (Hornjoserbšćina)' },
  { code: 'dsb', name: 'Lower Sorbian (Dolnoserbski)' },
  { code: 'fy', name: 'West Frisian (Frysk)' },
  { code: 'se', name: 'Northern Sámi (Davvisámegiella)' },
];

export default function Teams() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    leaderId: '', 
    languageCode: '',
    department: 'sales' as 'sales' | 'retention'
  });
  const { toast } = useToast();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['/api/teams'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({ title: t('common.success') });
      setIsOpen(false);
      setFormData({ name: '', leaderId: '', languageCode: '', department: 'sales' });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-teams-title">{t('teams.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('teams.subtitle.description')}
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-team" className="hover-elevate active-elevate-2">
              <Plus className="h-4 w-4 mr-2" />
              {t('teams.create.team')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('teams.create.new.team')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('teams.team.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('teams.team.name.placeholder')}
                  data-testid="input-team-name"
                />
              </div>
              <div>
                <Label>{t('teams.department')}</Label>
                <RadioGroup 
                  value={formData.department} 
                  onValueChange={(value: 'sales' | 'retention') => setFormData({ ...formData, department: value })}
                  className="flex gap-4 pt-2"
                  data-testid="radio-department"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sales" id="sales" data-testid="radio-department-sales" />
                    <Label htmlFor="sales" className="font-normal cursor-pointer">{t('teams.department.sales')}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="retention" id="retention" data-testid="radio-department-retention" />
                    <Label htmlFor="retention" className="font-normal cursor-pointer">{t('teams.department.retention')}</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>{t('teams.language')}</Label>
                <Select value={formData.languageCode} onValueChange={(value) => setFormData({ ...formData, languageCode: value })}>
                  <SelectTrigger data-testid="select-language">
                    <SelectValue placeholder={t('teams.select.language')} />
                  </SelectTrigger>
                  <SelectContent>
                    {EUROPEAN_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('teams.team.leader')}</Label>
                <Select value={formData.leaderId} onValueChange={(value) => setFormData({ ...formData, leaderId: value })}>
                  <SelectTrigger data-testid="select-team-leader">
                    <SelectValue placeholder={t('teams.select.team.leader')} />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>{t('common.cancel')}</Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending}
                  data-testid="button-save-team"
                  className="hover-elevate active-elevate-2"
                >
                  {createMutation.isPending ? t('teams.creating') : t('teams.create.team')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team: any) => (
            <Card key={team.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg" data-testid={`text-team-${team.id}`}>{team.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('teams.team.leader')}</p>
                    <p className="text-sm text-muted-foreground">{team.leader?.name || t('teams.not.assigned')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('teams.department')}</span>
                    <span className="font-medium capitalize">{team.department || t('teams.not.set')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('teams.language')}</span>
                    <span className="font-medium">{team.languageCode ? EUROPEAN_LANGUAGES.find(l => l.code === team.languageCode)?.name.split(' ')[0] : t('teams.not.set')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('teams.members.count')}</span>
                    <span className="font-medium">{team.memberCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('teams.clients.count')}</span>
                    <span className="font-medium">{team.clientCount || 0}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild data-testid={`button-manage-team-${team.id}`}>
                  <Link href={`/teams/${team.id}`}>{t('teams.manage.team')}</Link>
                </Button>
              </CardContent>
            </Card>
          )) || (
            <div className="col-span-full text-center py-12">
              <p className="text-sm text-muted-foreground">{t('teams.no.teams.found')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
