import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Copy, Check, Eye, EyeOff, RefreshCw, Loader2, AlertTriangle, Key, Trash2, Pencil, X, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/hooks/useTestMode";
import { useAuth } from "@/hooks/useAuth";

interface ApiKey {
  id: string;
  keyType: "publishable" | "secret";
  mode: "test" | "live";
  keyPrefix: string;
  fullKey?: string; // Only shown when revealed
  name?: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function DevelopersAPIKeys() {
  const { testMode } = useTestMode();
  const { merchant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [revealedKeyValues, setRevealedKeyValues] = useState<Map<string, string>>(new Map());
  const [regenerateDialog, setRegenerateDialog] = useState<{ open: boolean; keyId: string | null; keyType: "publishable" | "secret" | null }>({
    open: false,
    keyId: null,
    keyType: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; keyId: string | null; keyType: "publishable" | "secret" | null }>({
    open: false,
    keyId: null,
    keyType: null,
  });
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [isCodeGuideOpen, setIsCodeGuideOpen] = useState(false); // Start collapsed

  const { data: apiKeys = [], isLoading, refetch } = useQuery<ApiKey[]>({
    queryKey: ["/api/developers/api-keys"],
    queryFn: async () => {
      const response = await fetch("/api/developers/api-keys", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch API keys: ${response.statusText}`);
      }
      return await response.json();
    },
    enabled: !!merchant,
    refetchOnWindowFocus: true,
  });

  // Filter keys by current mode
  const filteredKeys = apiKeys.filter((key) => key.mode === (testMode ? "test" : "live"));

  const revealKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("POST", `/api/developers/api-keys/${keyId}/reveal`, {});
      return { keyId, ...(await response.json()) };
    },
    onSuccess: async (data: { keyId: string; fullKey: string }) => {
      // Store the revealed key ID and value immediately
      setRevealedKeys((prev) => new Set(prev).add(data.keyId));
      setRevealedKeyValues((prev) => new Map(prev).set(data.keyId, data.fullKey));
      
      // Update the query cache with the full key
      queryClient.setQueryData<ApiKey[]>(["/api/developers/api-keys"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((key) => 
          key.id === data.keyId ? { ...key, fullKey: data.fullKey } : key
        );
      });
      
      toast({
        title: "Key revealed",
        description: "Make sure to copy it now. It won't be shown again.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reveal key",
        variant: "destructive",
      });
    },
  });

  const createKeysMutation = useMutation({
    mutationFn: async (name?: string) => {
      let response: Response;
      try {
        response = await apiRequest("POST", "/api/developers/api-keys/create", {
          mode: testMode ? "test" : "live",
          name: name || undefined,
        });
      } catch (error) {
        // If apiRequest throws, it means the response was not OK
        throw error;
      }
      
      // Check content type
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`);
      }
      
      // Parse JSON
      try {
        const data = await response.json();
        return data;
      } catch (parseError) {
        // If JSON parsing fails, get the raw text for debugging
        const text = await response.clone().text();
        throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}`);
      }
    },
    onSuccess: async (data) => {
      // Invalidate all API keys queries (with and without mode)
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/developers/api-keys"],
        exact: false 
      });
      // Refetch to get the new keys
      await refetch();
      toast({
        title: "API Keys Created",
        description: "Your API keys have been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API keys",
        variant: "destructive",
      });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async ({ keyId, keyType }: { keyId: string; keyType: "publishable" | "secret" }) => {
      const response = await apiRequest("POST", `/api/developers/api-keys/${keyId}/regenerate`, {
        keyType,
        mode: testMode ? "test" : "live",
      });
      return await response.json();
    },
    onSuccess: async (data: { fullKey: string; id: string }) => {
      if (data.id && data.fullKey) {
        setRevealedKeys(new Set([data.id]));
        setRevealedKeyValues(new Map([[data.id, data.fullKey]]));
      }
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/developers/api-keys"],
        exact: false 
      });
      await refetch();
      toast({
        title: "Key regenerated",
        description: "Your new key has been generated. Make sure to update your integrations.",
        variant: "default",
      });
      setRegenerateDialog({ open: false, keyId: null, keyType: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate key",
        variant: "destructive",
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("DELETE", `/api/developers/api-keys/${keyId}`);
      return await response.json();
    },
    onSuccess: async () => {
      // Clear revealed keys state for deleted keys
      setRevealedKeys(new Set());
      setRevealedKeyValues(new Map());
      
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/developers/api-keys"],
        exact: false 
      });
      await refetch();
      toast({
        title: "Key deleted",
        description: "The API key pair has been deleted successfully.",
        variant: "default",
      });
      setDeleteDialog({ open: false, keyId: null, keyType: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete key",
        variant: "destructive",
      });
    },
  });

  const updateKeyNameMutation = useMutation({
    mutationFn: async ({ keyId, name }: { keyId: string; name: string }) => {
      const response = await apiRequest("PUT", `/api/developers/api-keys/${keyId}/name`, {
        name,
      });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/developers/api-keys"],
        exact: false 
      });
      await refetch();
      setEditingKeyId(null);
      setEditingName("");
      toast({
        title: "Name updated",
        description: "API key name has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update name",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied",
      description: "Key copied to clipboard",
    });
  };

  const handleReveal = (keyId: string) => {
    revealKeyMutation.mutate(keyId);
  };

  const handleRegenerate = (keyId: string, keyType: "publishable" | "secret") => {
    setRegenerateDialog({ open: true, keyId, keyType });
  };

  const confirmRegenerate = () => {
    if (regenerateDialog.keyId && regenerateDialog.keyType) {
      regenerateKeyMutation.mutate({
        keyId: regenerateDialog.keyId,
        keyType: regenerateDialog.keyType,
      });
    }
  };

  const handleDelete = (keyId: string, keyType: "publishable" | "secret") => {
    setDeleteDialog({ open: true, keyId, keyType });
  };

  const confirmDelete = () => {
    if (deleteDialog.keyId) {
      deleteKeyMutation.mutate(deleteDialog.keyId);
    }
  };

  const getDisplayKey = (key: ApiKey): string => {
    if (key.keyType === "publishable") {
      return key.fullKey || key.keyPrefix;
    }
    // Secret key - check both the cache and local state
    if (revealedKeys.has(key.id)) {
      // First check local state (immediate), then cache (after refetch)
      return revealedKeyValues.get(key.id) || key.fullKey || key.keyPrefix;
    }
    return key.keyPrefix + "••••••••••••••••";
  };

  const handleEditName = (key: ApiKey) => {
    setEditingKeyId(key.id);
    setEditingName(key.name || "");
  };

  const handleCancelEdit = () => {
    setEditingKeyId(null);
    setEditingName("");
  };

  const handleSaveName = (keyId: string) => {
    if (editingName.trim()) {
      updateKeyNameMutation.mutate({ keyId, name: editingName.trim() });
    } else {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
    }
  };

  const style = {
    "--sidebar-width": "var(--sidebar-width-expanded, 260px)",
    "--sidebar-width-icon": "var(--sidebar-width-collapsed, 72px)",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header 
            className="flex items-center justify-between gap-4 px-6 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0"
            style={{ height: 'var(--app-header-height)' }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-semibold">API Keys</h1>
                <p className="text-sm text-muted-foreground">
                  Manage keys to authenticate requests to ArcPayKit APIs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GasPriceDisplay />
              <StatusIndicator />
              <TestModeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Use these keys to integrate ArcPayKit payments into your application.
                  <br />
                  <strong className="text-foreground">Keep secret keys confidential.</strong>
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Publishable Key */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Publishable Key</span>
                        <Badge variant="secondary">Read-only</Badge>
                      </CardTitle>
                      <CardDescription>
                        Safe to expose in client-side code. Used on frontend.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {filteredKeys
                        .filter((k) => k.keyType === "publishable")
                        .map((key) => (
                          <div key={key.id} className="space-y-2">
                            <Label>Publishable Key ({key.mode})</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={getDisplayKey(key)}
                                readOnly
                                className="font-mono text-sm"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(getDisplayKey(key), key.id)}
                              >
                                {copied === key.id ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(key.id, "publishable")}
                                disabled={deleteKeyMutation.isPending}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            {key.lastUsedAt && (
                              <p className="text-xs text-muted-foreground">
                                Last used: {new Date(key.lastUsedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                    </CardContent>
                  </Card>

                  {/* Secret Key */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Secret Key</span>
                        <Badge variant="destructive">Keep secret</Badge>
                      </CardTitle>
                      <CardDescription>
                        Never expose this key. Use it only on your server.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {filteredKeys
                        .filter((k) => k.keyType === "secret")
                        .map((key) => {
                          const isRevealed = revealedKeys.has(key.id) && (revealedKeyValues.has(key.id) || key.fullKey);
                          return (
                            <div key={key.id} className="space-y-2">
                              <Label>Secret Key ({key.mode})</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={isRevealed ? "text" : "password"}
                                  value={getDisplayKey(key)}
                                  readOnly
                                  className="font-mono text-sm"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (isRevealed) {
                                      const keyValue = revealedKeyValues.get(key.id) || key.fullKey || getDisplayKey(key);
                                      copyToClipboard(keyValue, key.id);
                                    } else {
                                      handleReveal(key.id);
                                    }
                                  }}
                                  disabled={revealKeyMutation.isPending}
                                >
                                  {revealKeyMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : isRevealed ? (
                                    <Copy className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRegenerate(key.id, "secret")}
                                  disabled={regenerateKeyMutation.isPending}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(key.id, "secret")}
                                  disabled={deleteKeyMutation.isPending}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              {editingKeyId === key.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    placeholder="Enter API key name"
                                    className="max-w-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveName(key.id);
                                      } else if (e.key === "Escape") {
                                        handleCancelEdit();
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveName(key.id)}
                                    disabled={updateKeyNameMutation.isPending}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    disabled={updateKeyNameMutation.isPending}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {key.name ? (
                                    <p className="text-sm text-foreground font-medium">{key.name}</p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">No name</p>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditName(key)}
                                    className="h-6 px-2"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                              {key.lastUsedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Last used: {new Date(key.lastUsedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </CardContent>
                  </Card>
                </div>
              )}

              {filteredKeys.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Key className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No API Keys Found</h3>
                    <p className="text-muted-foreground mb-4 text-center max-w-md">
                      No API keys found for {testMode ? "test" : "live"} mode.
                    </p>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                      Generate your API keys to start integrating ArcPayKit payments into your application. (Limit: 2 pairs - one for test, one for live)
                    </p>
                    <Button
                      onClick={() => createKeysMutation.mutate()}
                      disabled={createKeysMutation.isPending}
                    >
                      {createKeysMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Generate API Keys
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {filteredKeys.length > 0 && filteredKeys.length < 2 && !isLoading && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => createKeysMutation.mutate()}
                    disabled={createKeysMutation.isPending || filteredKeys.length >= 2}
                  >
                    {createKeysMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Add API key
                      </>
                    )}
                  </Button>
                </div>
              )}

              {filteredKeys.length >= 2 && (
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    You have reached the maximum limit of 4 API keys (2 pairs). Delete an existing key to create a new one.
                  </p>
                </div>
              )}

              {/* API Key Usage Guide */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API Key Usage Guide
                  </CardTitle>
                  <CardDescription>
                    Learn how to use your API keys in your application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Understanding API Key Types</h3>
                      <div className="space-y-3 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔑 Publishable Key (pk_arc_*)</h4>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside mb-2">
                            <li><strong>Use for:</strong> Client-side applications (browser, mobile apps)</li>
                            <li><strong>Safe to expose:</strong> Yes, can be included in frontend code</li>
                            <li><strong>Permissions:</strong> Read-only operations (view payments, check status)</li>
                            <li><strong>Example:</strong> <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">pk_arc_live_...</code></li>
                          </ul>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">🔐 Secret Key (sk_arc_*)</h4>
                          <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside mb-2">
                            <li><strong>Use for:</strong> Server-side applications only (Node.js, Python, etc.)</li>
                            <li><strong>Safe to expose:</strong> No, never expose in client-side code</li>
                            <li><strong>Permissions:</strong> Full access (create payments, manage webhooks, etc.)</li>
                            <li><strong>Example:</strong> <code className="bg-red-100 dark:bg-red-900 px-1 rounded">sk_arc_live_...</code></li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Collapsible open={isCodeGuideOpen} onOpenChange={setIsCodeGuideOpen} className="mt-4">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium text-primary hover:text-primary/80 transition-colors py-2 px-2 -ml-2 rounded-md hover:bg-muted/50">
                        <span>Learn more about adding the code</span>
                        <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-200 ${isCodeGuideOpen ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 mt-4 pl-0">
                        <div>
                          <h3 className="font-semibold mb-2">1. Install ArcPayKit SDK</h3>
                          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                            <code>npm install arcpaykit</code>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">2. Set Up Your API Key</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            <strong>For Server-Side (Recommended):</strong> Use your <strong>Secret Key</strong> in your <code className="bg-muted px-1.5 py-0.5 rounded">.env</code> file:
                          </p>
                          <div className="bg-muted p-4 rounded-lg font-mono text-sm mb-3">
                            <code>ARCPAY_SECRET_KEY=sk_arc_live_...</code>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            <strong>For Client-Side:</strong> Use your <strong>Publishable Key</strong> (only for read operations):
                          </p>
                          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                            <code>ARCPAY_PUBLISHABLE_KEY=pk_arc_live_...</code>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ <strong>Important:</strong> Never commit your secret key to version control. Always use environment variables. Secret keys should only be used on the server.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">3. Initialize the SDK</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Server-Side (Node.js, Python, etc.):</strong> Use your Secret Key
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4">
                        <pre className="whitespace-pre-wrap">{`// Server-side - Use SECRET KEY
import { ArcPay } from 'arcpaykit';

const arcpay = new ArcPay(process.env.ARCPAY_SECRET_KEY);

// For development/testing, use test mode:
// const arcpay = new ArcPay(process.env.ARCPAY_SECRET_KEY, 'http://localhost:3000');`}</pre>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Client-Side (Browser, React, etc.):</strong> Use your Publishable Key (read-only)
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`// Client-side - Use PUBLISHABLE KEY (read-only)
import { ArcPay } from 'arcpaykit';

const arcpay = new ArcPay(process.env.ARCPAY_PUBLISHABLE_KEY);

// Note: Publishable keys can only retrieve payment info, not create payments`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">4. Create a Payment (Server-Side Only)</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>⚠️ Important:</strong> Payment creation requires a <strong>Secret Key</strong> and must be done server-side for security.
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`// This must be done on your SERVER, not in the browser
const payment = await arcpay.payments.create({
  amount: "99.00",
  currency: "USDC",
  merchantWallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  description: "Premium subscription",
  customerEmail: "customer@example.com",
  expiresInMinutes: 60
});

console.log(payment.checkout_url);
// Send this URL to your customer`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">5. Using REST API Directly</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        You can also use the REST API directly. <strong>Use Secret Key for creating payments, Publishable Key for reading.</strong>
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`// Server-side: Create payment (requires SECRET KEY)
fetch('https://pay.arcpaykit.com/api/payments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.ARCPAY_SECRET_KEY}\`
  },
  body: JSON.stringify({
    amount: "99.00",
    currency: "USDC",
    merchantWallet: "0x...",
    description: "Payment"
  })
});

// Client-side: Get payment info (can use PUBLISHABLE KEY)
fetch('https://pay.arcpaykit.com/api/payments/pay_123', {
  headers: {
    'Authorization': \`Bearer \${process.env.ARCPAY_PUBLISHABLE_KEY}\`
  }
});

// Alternative: Using x-api-key header
fetch('https://pay.arcpaykit.com/api/payments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ARCPAY_SECRET_KEY
  },
  body: JSON.stringify({...})
});`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">6. Test Your API Key</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Test if your API key is working correctly:
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`curl https://pay.arcpaykit.com/api/test \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Quick Reference: Which Key to Use?</h4>
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                        <div className="font-semibold mb-2">Use <strong>Secret Key (sk_arc_*)</strong> for:</div>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Creating payments (server-side only)</li>
                          <li>Managing webhooks</li>
                          <li>Creating refunds</li>
                          <li>Any write operations</li>
                        </ul>
                        <div className="font-semibold mt-3 mb-2">Use <strong>Publishable Key (pk_arc_*)</strong> for:</div>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Retrieving payment status (client-side OK)</li>
                          <li>Viewing payment details</li>
                          <li>Read-only operations</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">⚠️ Security Best Practices</h4>
                      <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
                        <li><strong>Secret keys:</strong> Only use on server-side, never in browser/client code</li>
                        <li><strong>Publishable keys:</strong> Safe for client-side, but limited to read operations</li>
                        <li>Store keys in environment variables, never commit to git</li>
                        <li>Rotate your keys regularly for security</li>
                        <li>Use test mode keys during development</li>
                        <li>If a secret key is exposed, regenerate it immediately</li>
                      </ul>
                    </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      <AlertDialog open={regenerateDialog.open} onOpenChange={(open) => setRegenerateDialog({ ...regenerateDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Regenerate API Key?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate existing integrations using this key. You'll need to update
              your code with the new key immediately.
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRegenerate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {regenerateKeyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate Key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete API Key?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this API key and its paired key (both publishable and secret keys for this mode). All integrations using these keys will stop working immediately.
              <br />
              <strong>This action cannot be undone.</strong> Make sure you have new keys ready if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteKeyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

