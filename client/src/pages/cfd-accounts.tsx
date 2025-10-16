import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, TrendingUp, TrendingDown, User } from "lucide-react";
import { Link } from "wouter";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string | null;
  status: string;
  hasFTD: boolean;
}

interface Account {
  id: string;
  clientId: string;
  accountNumber: string;
  realBalance: string;
  demoBalance: string;
  bonusBalance: string;
  equity: string;
  margin: string;
  freeMargin: string;
  marginLevel: string | null;
  leverage: number;
  isActive: boolean;
  createdAt: string;
}

interface CFDAccountWithClient extends Account {
  client: Client;
}

export default function CFDAccountsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all accounts (admin view)
  const { data: accounts = [], isLoading } = useQuery<CFDAccountWithClient[]>({
    queryKey: ["/api/accounts/all"],
  });

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const clientName = `${account.client.firstName} ${account.client.lastName}`.toLowerCase();
    const search = searchQuery.toLowerCase();
    return (
      clientName.includes(search) ||
      account.accountNumber.toLowerCase().includes(search) ||
      account.client.email.toLowerCase().includes(search)
    );
  });

  // Calculate statistics
  const stats = {
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter((a) => a.isActive).length,
    totalEquity: accounts.reduce((sum, a) => sum + parseFloat(a.equity || "0"), 0),
    totalMargin: accounts.reduce((sum, a) => sum + parseFloat(a.margin || "0"), 0),
    atRisk: accounts.filter(
      (a) => parseFloat(a.marginLevel || "0") < 100 && parseFloat(a.marginLevel || "0") > 0
    ).length,
  };

  const getMarginLevelBadge = (marginLevel: string | null, equity: string) => {
    if (!marginLevel || parseFloat(equity) === 0) {
      return <Badge variant="secondary">N/A</Badge>;
    }
    const level = parseFloat(marginLevel);
    if (level < 50) {
      return <Badge variant="destructive">Critical ({level.toFixed(0)}%)</Badge>;
    }
    if (level < 100) {
      return <Badge className="bg-orange-500">Warning ({level.toFixed(0)}%)</Badge>;
    }
    return <Badge variant="default">Healthy ({level.toFixed(0)}%)</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          CFD Accounts
        </h1>
        <p className="text-muted-foreground">
          Monitor all client trading accounts and margin health
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Accounts</div>
          <div className="text-2xl font-bold mt-1">{stats.totalAccounts}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {stats.activeAccounts}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Equity</div>
          <div className="text-2xl font-bold mt-1">
            ${stats.totalEquity.toFixed(2)}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Margin Used</div>
          <div className="text-2xl font-bold mt-1">
            ${stats.totalMargin.toFixed(2)}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">At Risk</div>
          <div className="text-2xl font-bold mt-1 text-orange-600">
            {stats.atRisk}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by client name, account number, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-accounts"
        />
      </div>

      {/* Accounts Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Real Balance</TableHead>
              <TableHead>Demo Balance</TableHead>
              <TableHead>Equity</TableHead>
              <TableHead>Margin Used</TableHead>
              <TableHead>Free Margin</TableHead>
              <TableHead>Margin Level</TableHead>
              <TableHead>Leverage</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading accounts...
                </TableCell>
              </TableRow>
            ) : filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  No accounts found
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => {
                const totalBalance =
                  parseFloat(account.realBalance || "0") +
                  parseFloat(account.demoBalance || "0") +
                  parseFloat(account.bonusBalance || "0");
                const equity = parseFloat(account.equity || "0");
                const pnl = equity - totalBalance;
                const isProfitable = pnl > 0;

                return (
                  <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                    <TableCell>
                      <Link href={`/clients/${account.clientId}`}>
                        <button className="hover:underline text-left">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {account.client.firstName} {account.client.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {account.client.email}
                              </div>
                            </div>
                          </div>
                        </button>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono">{account.accountNumber}</TableCell>
                    <TableCell>${parseFloat(account.realBalance || "0").toFixed(2)}</TableCell>
                    <TableCell>${parseFloat(account.demoBalance || "0").toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">${equity.toFixed(2)}</span>
                        {pnl !== 0 && (
                          <span className={isProfitable ? "text-green-600" : "text-red-600"}>
                            {isProfitable ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                      {pnl !== 0 && (
                        <div
                          className={`text-xs ${
                            isProfitable ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isProfitable ? "+" : ""}${pnl.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(account.margin || "0").toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(account.freeMargin || "0").toFixed(2)}
                    </TableCell>
                    <TableCell>{getMarginLevelBadge(account.marginLevel, account.equity)}</TableCell>
                    <TableCell>{account.leverage}:1</TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
