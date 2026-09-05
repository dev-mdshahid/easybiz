"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  saveOrderCreationSettings,
  type PublicOrderCreationSettings,
} from "@/app/expected-order-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_PROVIDER_OPTIONS,
  getAiProvider,
  type AiProvider,
} from "@/lib/ai-providers";
import type { ItemType } from "@/lib/expected-order";

export function OrderCreationSettings({
  settings,
}: {
  settings: PublicOrderCreationSettings | null;
}) {
  const [pending, startTransition] = useTransition();
  const [itemType, setItemType] = useState<ItemType>(
    settings?.default_item_type ?? "parcel",
  );
  const [provider, setProvider] = useState<AiProvider>(
    settings?.ai_provider ?? "openai",
  );

  const providerSpec = useMemo(() => getAiProvider(provider), [provider]);

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order creation (AI)</CardTitle>
        <CardDescription>
          Pick a provider, paste that provider’s API key, and paste the model
          code. The key stays on the server and is only used to read chat
          screenshots. Leave the key blank to keep the saved one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          action={(formData) => {
            formData.set("default_item_type", itemType);
            formData.set("ai_provider", provider);
            startTransition(async () => {
              const result = await saveOrderCreationSettings(formData);
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              toast.success("Order creation settings saved");
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                if (
                  value === "openai" ||
                  value === "gemini" ||
                  value === "openrouter"
                ) {
                  setProvider(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{providerSpec.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ai_model">Model</Label>
            <Input
              id="ai_model"
              name="ai_model"
              defaultValue={settings.ai_model}
              placeholder={providerSpec.exampleModel}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <p className="text-xs text-muted-foreground">
              Paste the model id from the provider, for example{" "}
              {providerSpec.exampleModel}.
            </p>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="ai_api_key">{providerSpec.label} API key</Label>
            <Input
              id="ai_api_key"
              name="ai_api_key"
              type="password"
              autoComplete="off"
              placeholder={
                settings.hasApiKey
                  ? `Saved (${settings.apiKeyHint})`
                  : providerSpec.keyPlaceholder
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="default_store_name">Default store name</Label>
            <Input
              id="default_store_name"
              name="default_store_name"
              defaultValue={settings.default_store_name}
              placeholder="Optional Pathao store name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Default item type</Label>
            <Select
              value={itemType}
              onValueChange={(value) => {
                if (value === "parcel" || value === "document") {
                  setItemType(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parcel">parcel</SelectItem>
                <SelectItem value="document">document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="default_item_weight">Default weight (kg)</Label>
            <Input
              id="default_item_weight"
              name="default_item_weight"
              inputMode="decimal"
              defaultValue={String(settings.default_item_weight)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="screenshot_batch_size">Screenshots per extract</Label>
            <Input
              id="screenshot_batch_size"
              name="screenshot_batch_size"
              inputMode="numeric"
              defaultValue={String(settings.screenshot_batch_size)}
            />
            <p className="text-xs text-muted-foreground">
              How many screenshots go in one AI extract (1–16). Extra files wait
              in a queue on Expected orders; they are not sent all at once.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save AI settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
