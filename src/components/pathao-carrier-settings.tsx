"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  savePathaoSettings,
  testPathaoConnection,
  type PublicPathaoSettings,
} from "@/app/pathao-actions";
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
import { PATHAO_ENVIRONMENTS, type PathaoStore } from "@/lib/pathao-api";
import { formatDhaka } from "@/lib/time";

export function PathaoCarrierSettings({
  settings,
}: {
  settings: PublicPathaoSettings | null;
}) {
  const [pending, startTransition] = useTransition();
  const [environment, setEnvironment] = useState(
    settings?.environment ?? "production",
  );
  const [deliveryType, setDeliveryType] = useState(
    String(settings?.deliveryType ?? 48),
  );
  const [stores, setStores] = useState<PathaoStore[]>(
    settings?.storeId
      ? [
          {
            store_id: settings.storeId,
            store_name: settings.storeName || `Store ${settings.storeId}`,
            is_active: 1,
          },
        ]
      : [],
  );
  const [storeId, setStoreId] = useState(
    settings?.storeId ? String(settings.storeId) : "",
  );

  const selectedStore = useMemo(
    () => stores.find((store) => String(store.store_id) === storeId),
    [stores, storeId],
  );

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pathao</CardTitle>
        <CardDescription>
          Credentials from Pathao Merchant → Developer → API Credentials. Orders
          are created with auto-address: city, zone, and area IDs are omitted so
          Pathao reads the formatted recipient address.{" "}
          <Link
            href="https://merchant.pathao.com/developer"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Open developer portal
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          action={(formData) => {
            formData.set("pathao_environment", environment);
            formData.set("pathao_delivery_type", deliveryType);
            formData.set("pathao_store_id", storeId);
            formData.set("pathao_store_name", selectedStore?.store_name ?? "");
            startTransition(async () => {
              const result = await savePathaoSettings(formData);
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              toast.success("Pathao carrier settings saved");
            });
          }}
        >
          <div className="grid gap-1.5">
            <Label>Environment</Label>
            <Select
              value={environment}
              onValueChange={(value) => {
                if (value === "sandbox" || value === "production") {
                  setEnvironment(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">
                  {PATHAO_ENVIRONMENTS.production.label}
                </SelectItem>
                <SelectItem value="sandbox">
                  {PATHAO_ENVIRONMENTS.sandbox.label}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Delivery type</Label>
            <Select
              value={deliveryType}
              onValueChange={(value) => {
                if (typeof value === "string") setDeliveryType(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="48">Normal (48)</SelectItem>
                <SelectItem value="12">On demand (12)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pathao_client_id">Client ID</Label>
            <Input
              id="pathao_client_id"
              name="pathao_client_id"
              defaultValue={settings.clientId}
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pathao_username">Username (merchant email)</Label>
            <Input
              id="pathao_username"
              name="pathao_username"
              defaultValue={settings.username}
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pathao_client_secret">Client secret</Label>
            <Input
              id="pathao_client_secret"
              name="pathao_client_secret"
              type="password"
              placeholder={
                settings.hasClientSecret
                  ? `Saved ${settings.clientSecretHint}`
                  : "Paste client secret"
              }
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pathao_password">Password</Label>
            <Input
              id="pathao_password"
              name="pathao_password"
              type="password"
              placeholder={
                settings.hasPassword
                  ? `Saved ${settings.passwordHint}`
                  : "Merchant password"
              }
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Pickup store</Label>
            <Select
              value={storeId}
              onValueChange={(value) => {
                if (typeof value === "string") setStoreId(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Test connection to load stores" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.store_id} value={String(store.store_id)}>
                    {store.store_name} ({store.store_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="pathao_store_id" value={storeId} />
            <input
              type="hidden"
              name="pathao_store_name"
              value={selectedStore?.store_name ?? ""}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (!form) return;
                const formData = new FormData(form);
                formData.set("pathao_environment", environment);
                startTransition(async () => {
                  const result = await testPathaoConnection(formData);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  setStores(result.stores);
                  if (
                    result.stores.length > 0 &&
                    !result.stores.some((store) => String(store.store_id) === storeId)
                  ) {
                    setStoreId(String(result.stores[0].store_id));
                  }
                  toast.success(
                    `Connected as ${result.merchant}. ${result.stores.length} store${result.stores.length === 1 ? "" : "s"} found.`,
                  );
                });
              }}
            >
              {pending ? "Working…" : "Test connection"}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save Pathao settings"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {settings.connectedAt
                ? `Last verified ${formatDhaka(settings.connectedAt)}.`
                : "Not verified yet."}
              {settings.connected && settings.storeName
                ? ` Using ${settings.storeName}.`
                : ""}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
