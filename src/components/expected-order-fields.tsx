import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ItemType } from "@/lib/expected-order";

export type ExpectedOrderFieldValues = {
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  recipient_city?: string;
  recipient_zone?: string;
  recipient_area?: string;
  amount_to_collect?: string;
  item_quantity?: string;
  item_weight?: string;
  item_desc?: string;
  special_instruction?: string;
  store_name?: string;
};

export function ExpectedOrderFields({
  idPrefix,
  values,
  itemType,
  onItemTypeChange,
}: {
  idPrefix: string;
  values?: ExpectedOrderFieldValues;
  itemType: ItemType;
  onItemTypeChange: (value: ItemType) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Recipient name</Label>
        <Input
          id={`${idPrefix}-name`}
          name="recipient_name"
          defaultValue={values?.recipient_name}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
        <Input
          id={`${idPrefix}-phone`}
          name="recipient_phone"
          defaultValue={values?.recipient_phone}
          placeholder="01710000000"
          required
        />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-address`}>Address</Label>
        <Textarea
          id={`${idPrefix}-address`}
          name="recipient_address"
          defaultValue={values?.recipient_address}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          name="recipient_city"
          defaultValue={values?.recipient_city}
          placeholder="Dhaka"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-zone`}>Zone</Label>
        <Input
          id={`${idPrefix}-zone`}
          name="recipient_zone"
          defaultValue={values?.recipient_zone}
          placeholder="Uttara"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-area`}>Area (optional)</Label>
        <Input
          id={`${idPrefix}-area`}
          name="recipient_area"
          defaultValue={values?.recipient_area}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-amount`}>Amount to collect</Label>
        <Input
          id={`${idPrefix}-amount`}
          name="amount_to_collect"
          inputMode="decimal"
          className="tabular-nums"
          defaultValue={values?.amount_to_collect}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-qty`}>Quantity</Label>
        <Input
          id={`${idPrefix}-qty`}
          name="item_quantity"
          inputMode="numeric"
          className="tabular-nums"
          defaultValue={values?.item_quantity ?? "1"}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-weight`}>Weight (kg)</Label>
        <Input
          id={`${idPrefix}-weight`}
          name="item_weight"
          inputMode="decimal"
          className="tabular-nums"
          defaultValue={values?.item_weight ?? "0.5"}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-desc`}>Item description</Label>
        <Input
          id={`${idPrefix}-desc`}
          name="item_desc"
          defaultValue={values?.item_desc}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-store`}>Store name</Label>
        <Input
          id={`${idPrefix}-store`}
          name="store_name"
          defaultValue={values?.store_name}
        />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-instruction`}>Special instruction</Label>
        <Input
          id={`${idPrefix}-instruction`}
          name="special_instruction"
          defaultValue={values?.special_instruction}
        />
      </div>
      <input type="hidden" name="item_type" value={itemType} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-type`}>Item type</Label>
        <select
          id={`${idPrefix}-type`}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={itemType}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "parcel" || value === "document") {
              onItemTypeChange(value);
            }
          }}
        >
          <option value="parcel">parcel</option>
          <option value="document">document</option>
        </select>
      </div>
    </div>
  );
}
