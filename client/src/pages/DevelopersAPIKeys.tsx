import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
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
import { Copy, Check, Eye, EyeOff, RefreshCw, Loader2, AlertTriangle, Key, Trash2, Pencil, X } from "lucide-react";
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
      return await response.json();
    },
    onSuccess: async (data: { fullKey: string }) => {
      if (regenerateDialog.keyId) {
        setRevealedKeys((prev) => new Set(prev).add(regenerateDialog.keyId!));
      }
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/developers/api-keys"],
        exact: false 
      });
      await refetch();
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
      if (data.id) {
        setRevealedKeys(new Set([data.id]));
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
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/developers/api-keys"],
        exact: false 
      });
      await refetch();
      toast({
        title: "Key deleted",
        description: "The API key has been deleted successfully.",
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
    // Secret key
    if (revealedKeys.has(key.id) && key.fullKey) {
      return key.fullKey;
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
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">API Keys</h1>
                <p className="text-sm text-muted-foreground">
                  Manage keys to authenticate requests to ArcPayKit APIs
                </p>
              </div>
            </div>
            <TestModeToggle />
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
                          const isRevealed = revealedKeys.has(key.id) && key.fullKey;
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
                                      copyToClipboard(key.fullKey!, key.id);
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
                      Generate your API keys to start integrating ArcPayKit payments into your application. (Limit: 2 keys)
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
                    You have reached the maximum limit of 2 API keys. Delete an existing key to create a new one.
                  </p>
                </div>
              )}
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
              This will permanently delete this API key. All integrations using this key will stop working immediately.
              <br />
              <strong>This action cannot be undone.</strong> Make sure you have a new key ready if needed.
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

