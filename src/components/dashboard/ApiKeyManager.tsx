import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  Copy,
  Eye,
  EyeOff,
  Check,
  Clock,
  ArrowUpDown,
  Shield,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
// Define ApiKey type locally since we're using Supabase directly
interface ApiKey {
  id: string;
  // key is only shown immediately after creation; not stored in DB
  key?: string;
  // Service scoping: 'all' or 'specific'
  service?: string;
  user_id: string;
  name: string;
  expires_at: string | null;
  is_active: boolean | null;
  created_at: string;
}

// User's configured external service
interface ConfiguredService {
  service_key: string;
  display_name: string;
  category: string;
  is_enabled: boolean;
}

// Service scope for API key
interface ServiceScope {
  service_key: string;
  allowed_actions?: string[];
  max_calls_per_minute?: number;
  max_calls_per_day?: number;
}
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

// SHA-256 helper (browser Web Crypto)
async function sha256Hex(input: string): Promise<string> {
  // Check if crypto.subtle is available (requires secure context/HTTPS)
  if (!crypto || !crypto.subtle) {
    throw new Error(
      'Web Crypto API is not available. This feature requires HTTPS. ' +
      'Please ensure you are accessing the site over a secure connection.'
    );
  }

  try {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('SHA-256 hashing error:', error);
    throw new Error(
      `Failed to hash API key: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Please ensure you are using a modern browser with Web Crypto API support.'
    );
  }
}

// Helper to format service type for display
function getServiceTypeDisplayName(serviceType: string): string {
  return serviceType === "specific" ? "Specific Services" : "All Services";
}

export const ApiKeyManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const [keyName, setKeyName] = useState("");
  const [keyExpiration, setKeyExpiration] = useState("never");
  const [customExpiration, setCustomExpiration] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  // Service scoping state
  const [serviceType, setServiceType] = useState<'all' | 'specific'>('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [configuredServices, setConfiguredServices] = useState<ConfiguredService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  const { toast } = useToast();
  const { user } = useSupabaseAuth();

  // Check if Web Crypto API is available
  const isCryptoAvailable = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

  // Fetch user's configured external services for scoping
  const fetchConfiguredServices = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingServices(true);
    try {
      // Query user_mcp_services table for their configured services
      const { data, error } = await supabase
        .from('user_mcp_services')
        .select(`
          service_key,
          display_name,
          category,
          is_enabled
        `)
        .eq('user_id', user.id)
        .eq('is_enabled', true)
        .order('display_name');

      if (error) {
        console.warn('Could not fetch configured services:', error);
        // Fallback to empty array - user can still use 'all' scope
        setConfiguredServices([]);
        return;
      }

      setConfiguredServices(data || []);
    } catch (error) {
      console.error('Error fetching configured services:', error);
      setConfiguredServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  }, [user]);

  // Toggle service selection
  const toggleServiceSelection = (serviceKey: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceKey)
        ? prev.filter(k => k !== serviceKey)
        : [...prev, serviceKey]
    );
  };

  const fetchApiKeys = useCallback(async () => {
    if (!user?.id) {
      console.warn(
        "ApiKeyManager: Cannot fetch keys without authenticated user"
      );
      return;
    }

    setIsLoadingKeys(true);
    try {
      // Use Supabase directly for API key management
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Defensive: ensure data is array before mapping
      const keys = Array.isArray(data) ? data : [];
      setApiKeys(keys);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch API keys";
      console.error("ApiKeyManager: fetchApiKeys error:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingKeys(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (isOpen && activeTab === "manage") {
      fetchApiKeys();
    }
  }, [isOpen, activeTab, fetchApiKeys]);

  // Fetch configured services when creating a key
  useEffect(() => {
    if (isOpen && activeTab === "create") {
      fetchConfiguredServices();
    }
  }, [isOpen, activeTab, fetchConfiguredServices]);

  const copyToClipboard = async () => {
    if (!generatedKey) {
      console.warn("ApiKeyManager: No API key to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("ApiKeyManager: Failed to copy to clipboard:", error);
      toast({
        title: "Copy Failed",
        description: "Could not copy API key to clipboard",
        variant: "destructive",
      });
    }
  };

  const generateApiKey = async () => {
    if (!keyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be authenticated to generate API keys",
        variant: "destructive",
      });
      return;
    }

    // Check if Web Crypto API is available
    if (!isCryptoAvailable) {
      toast({
        title: "Security Error",
        description: "Web Crypto API is not available. This feature requires HTTPS. Please ensure you are accessing the site over a secure connection.",
        variant: "destructive",
      });
      return;
    }

    // Validate custom expiration date if selected
    if (keyExpiration === "custom" && !customExpiration) {
      toast({
        title: "Error",
        description: "Please select a custom expiration date",
        variant: "destructive",
      });
      return;
    }

    // Validate service selection
    if (serviceType === "specific" && selectedServices.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one service when using specific service access",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Generate key locally with lano_ prefix (matches oauth-client and auth-gateway)
      const randomKey = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 36).toString(36)
      ).join("");

      const formattedKey = `lano_${randomKey}`;
      setGeneratedKey(formattedKey);

      let expirationDate: string | null = null;
      if (keyExpiration === "custom") {
        const customDate = new Date(customExpiration);
        if (customDate < new Date()) {
          throw new Error("Expiration date must be in the future");
        }
        expirationDate = customDate.toISOString();
      } else if (keyExpiration !== "never") {
        expirationDate = new Date(
          Date.now() + parseInt(keyExpiration) * 86400000
        ).toISOString();
      }

      // Hash before storing; only the hashed form goes to the database
      const keyHash = await sha256Hex(formattedKey);

      // Try inserting with key_hash first (preferred method)
      let data: any = null;
      let error: any = null;
      
      try {
        const result = await supabase
          .from("api_keys")
          .insert({
            name: keyName.trim(),
            key: formattedKey,  // Store plain key (required by schema)
            key_hash: keyHash,   // SHA-256 hash for validation
            service: serviceType,  // 'all' or 'specific'
            user_id: user.id,
            expires_at: expirationDate,
            is_active: true,
          })
          .select()
          .single();
        
        data = result.data;
        error = result.error;
        
        if (error) throw error;
      } catch (firstError: any) {
        // If key_hash column doesn't exist (migration not complete), try without it
        if (firstError?.code === '42703' || 
            firstError?.message?.includes('key_hash') || 
            firstError?.message?.includes('column') ||
            firstError?.code === 'PGRST116') {
          console.log('[ApiKeyManager] key_hash column not found, inserting without it');
          const result = await supabase
            .from("api_keys")
            .insert({
              name: keyName.trim(),
              key: formattedKey,
              service: serviceType,  // 'all' or 'specific'
              user_id: user.id,
              expires_at: expirationDate,
              is_active: true,
            })
            .select()
            .single();
          
          data = result.data;
          error = result.error;
          
          if (error) throw error;
        } else {
          throw firstError;
        }
      }

      if (error) {
        console.error("Supabase insert error:", error);
        // Provide more specific error messages
        if (error.code === "23505") {
          throw new Error("An API key with this name already exists");
        } else if (error.code === "42501") {
          throw new Error("Permission denied. Please check your account permissions.");
        } else if (error.message) {
          throw new Error(error.message);
        } else {
          throw new Error(`Failed to create API key: ${error.code || "Unknown error"}`);
        }
      }

      if (!data) {
        throw new Error("API key was created but no data was returned");
      }

      // Insert service scopes if using specific services
      if (serviceType === "specific" && selectedServices.length > 0 && data.id) {
        const scopeRecords = selectedServices.map(serviceKey => ({
          api_key_id: data.id,
          service_key: serviceKey,
          allowed_actions: null,
          max_calls_per_minute: null,
          max_calls_per_day: null,
          is_active: true,
        }));

        const { error: scopesError } = await supabase
          .from("api_key_scopes")
          .insert(scopeRecords);

        if (scopesError) {
          console.warn("Failed to insert service scopes:", scopesError);
          // Don't fail the request - key is created, just log the scope issue
        }
      }

      toast({
        title: "API Key Generated",
        description:
          "Your API key has been generated successfully. Make sure to copy it now.",
      });

      setShowKey(true);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error 
          ? error.message 
          : typeof error === "string"
          ? error
          : "Failed to generate API key. Please try again.";
      console.error("ApiKeyManager: generateApiKey error:", error);
      toast({
        title: "Error Generating API Key",
        description: errorMessage,
        variant: "destructive",
      });
      // Reset generated key on error
      setGeneratedKey("");
    } finally {
      setIsLoading(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be authenticated to revoke API keys",
        variant: "destructive",
      });
      return;
    }

    if (!keyId) {
      console.error("ApiKeyManager: revokeApiKey called without keyId");
      return;
    }

    try {
      // Use Supabase directly for API key revocation
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", keyId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "API Key Revoked",
        description: "The API key has been successfully revoked",
      });

      // Refresh the list
      await fetchApiKeys();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to revoke API key";
      console.error("ApiKeyManager: revokeApiKey error:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Key className="h-4 w-4 mr-2" />
          Memory API Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] text-foreground bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Memory Service API Keys</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create and manage API keys for accessing the LanOnasis Memory Service API.
            These keys are different from MCP Router Keys.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="create">Create Key</TabsTrigger>
            <TabsTrigger value="manage">Your Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            {!generatedKey ? (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="My API Key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="service">Service Access</Label>
                  <Select value={serviceType} onValueChange={(v) => setServiceType(v as 'all' | 'specific')}>
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select access type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services (Default)</SelectItem>
                      <SelectItem value="specific">Specific Services</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {serviceType === "all"
                      ? "This key will have access to all your configured services."
                      : "Select which services this key can access."}
                  </p>
                </div>

                {serviceType === "specific" && (
                  <div className="grid gap-2">
                    <Label>Select Services</Label>
                    {isLoadingServices ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : configuredServices.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-3 bg-secondary/30 rounded-md">
                        <p>No services configured yet.</p>
                        <p className="text-xs mt-1">Configure services in the MCP Services section first, or use "All Services" access.</p>
                      </div>
                    ) : (
                      <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                        {configuredServices.map((service) => (
                          <div key={service.service_key} className="flex items-center space-x-2">
                            <Switch
                              id={`service-${service.service_key}`}
                              checked={selectedServices.includes(service.service_key)}
                              onCheckedChange={() => toggleServiceSelection(service.service_key)}
                              disabled={!service.is_enabled}
                            />
                            <Label
                              htmlFor={`service-${service.service_key}`}
                              className={`text-sm cursor-pointer ${!service.is_enabled ? 'text-muted-foreground' : ''}`}
                            >
                              {service.display_name || service.service_key}
                              {service.category && (
                                <span className="text-xs text-muted-foreground ml-2">({service.category})</span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedServices.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="expiration">Expiration</Label>
                  <Select
                    value={keyExpiration}
                    onValueChange={setKeyExpiration}
                  >
                    <SelectTrigger id="expiration">
                      <SelectValue placeholder="Select expiration time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="custom">Custom date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {keyExpiration === "custom" && (
                  <div className="grid gap-2">
                    <Label htmlFor="custom-expiration">
                      Custom Expiration Date
                    </Label>
                    <Input
                      id="custom-expiration"
                      type="date"
                      value={customExpiration}
                      onChange={(e) => setCustomExpiration(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}

                <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                  <p>
                    {serviceType === "all"
                      ? "This API key will have access to all your configured services and Memory services."
                      : "This API key will have access to selected services and Memory services (always included)."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="api-key">Your API Key</Label>
                  <div className="relative">
                    <Input
                      id="api-key"
                      type={showKey ? "text" : "password"}
                      value={generatedKey}
                      readOnly
                      className="pr-20 font-mono"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        aria-label={showKey ? "Hide API key" : "Show API key"}
                      >
                        {showKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="p-1 ml-1 text-muted-foreground hover:text-foreground"
                        aria-label="Copy API key"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                  <p className="font-medium text-destructive dark:text-destructive">Important:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-foreground/80">
                    <li>
                      This API key will only be displayed once and cannot be
                      retrieved later.
                    </li>
                    <li>Please copy and store it in a secure location.</li>
                    <li>If lost, you'll need to generate a new key.</li>
                  </ul>
                </div>

                <div className="bg-secondary/50 p-4 rounded-md border border-border">
                  <h4 className="text-sm font-medium mb-2 text-foreground">API Key Details</h4>
                  <div className="text-sm space-y-1">
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">{keyName}</span>
                    </p>
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Services:</span>{" "}
                      <span className="font-medium">
                        {serviceType === "all"
                          ? "All Services"
                          : selectedServices.length > 0
                          ? `${selectedServices.length} specific service${selectedServices.length !== 1 ? 's' : ''}`
                          : "None selected"}
                      </span>
                    </p>
                    {serviceType === "specific" && selectedServices.length > 0 && (
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">Selected: </span>
                        {selectedServices.map((key, idx) => {
                          const svc = configuredServices.find(s => s.service_key === key);
                          return (
                            <span key={key}>
                              {svc?.display_name || key}
                              {idx < selectedServices.length - 1 ? ', ' : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Expires:</span>{" "}
                      <span className="font-medium">
                        {keyExpiration === "never"
                          ? "Never"
                          : keyExpiration === "custom"
                          ? new Date(customExpiration).toLocaleDateString()
                          : new Date(
                              Date.now() + parseInt(keyExpiration) * 86400000
                            ).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {!generatedKey ? (
                <Button
                  onClick={generateApiKey}
                  disabled={
                    isLoading ||
                    (keyExpiration === "custom" && !customExpiration)
                  }
                >
                  {isLoading ? "Generating..." : "Generate API Key"}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedKey("");
                      setKeyName("");
                      setServiceType("all");
                      setSelectedServices([]);
                      setKeyExpiration("never");
                      setCustomExpiration("");
                      setShowKey(false);
                    }}
                  >
                    Create Another
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveTab("manage");
                      setGeneratedKey("");
                      fetchApiKeys();
                    }}
                  >
                    Manage Keys
                  </Button>
                </div>
              )}
            </DialogFooter>
          </TabsContent>

          <TabsContent value="manage">
            <div className="py-4">
              {isLoadingKeys ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You don't have any API keys yet
                  </p>
                  <Button onClick={() => setActiveTab("create")}>
                    Create Your First API Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground dark:text-muted-foreground mb-2">
                    You have {apiKeys.length} API{" "}
                    {apiKeys.length === 1 ? "key" : "keys"}
                  </div>

                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className={`p-4 border rounded-lg ${
                          isExpired(key.expires_at)
                            ? "bg-destructive/5 border-destructive/30"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium flex items-center text-foreground">
                              {key.name}
                              {isExpired(key.expires_at) && (
                                <Badge
                                  variant="destructive"
                                  className="ml-2 text-xs"
                                >
                                  Expired
                                </Badge>
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                              Access:{" "}
                              {key.service === "specific"
                                ? "Specific Services"
                                : "All Services"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => revokeApiKey(key.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-xs text-muted-foreground dark:text-muted-foreground grid grid-cols-2 gap-y-1">
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span className="text-foreground/80">ID: {key.id.substring(0, 8)}...</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-foreground/80">Created: {formatDate(key.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-foreground/80">Expires: {formatDate(key.expires_at)}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            View Activity
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setActiveTab("create")}>
                  Create New Key
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
