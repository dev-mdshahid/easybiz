"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addExpectedOrder } from "@/app/expected-order-actions";
import { ExpectedOrderFields } from "@/components/expected-order-fields";
import { Button } from "@/components/ui/button";
import type { ItemType } from "@/lib/expected-order";

export function ManualExpectedOrderForm({
  defaultStoreName,
  defaultWeight,
  defaultItemType,
}: {
  defaultStoreName: string;
  defaultWeight: number;
  defaultItemType: ItemType;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [itemType, setItemType] = useState<ItemType>(defaultItemType);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Add order manually
      </Button>
    );
  }

  return (
    <form
      className="grid gap-3"
      action={(formData) => {
        startTransition(async () => {
          const result = await addExpectedOrder(formData);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Expected order saved");
          setOpen(false);
          setItemType(defaultItemType);
        });
      }}
    >
      <ExpectedOrderFields
        idPrefix="manual-order"
        itemType={itemType}
        onItemTypeChange={setItemType}
        values={{
          store_name: defaultStoreName,
          item_weight: String(defaultWeight),
          item_quantity: "1",
        }}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save order"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
