"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addLender,
  addLiability,
  addRepayment,
  deleteLiability,
  deleteRepayment,
  updateLiability,
  updateRepayment,
  type LiabilityBalance,
} from "@/app/liability-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTodayDhaka } from "@/hooks/use-today-dhaka";
import { uniqueLenders } from "@/lib/liability";
import { formatBdt } from "@/lib/money";
import type { LiabilityRepayment } from "@/lib/supabase/database.types";

function amountInputValue(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function dateInputValue(value: string): string {
  return value.slice(0, 10);
}

const ADD_LENDER = "__add_lender__";

function LenderPicker({
  idPrefix,
  lenders,
  defaultLender,
  onLendersChange,
}: {
  idPrefix: string;
  lenders: string[];
  defaultLender?: string;
  onLendersChange?: (names: string[]) => void;
}) {
  const [names, setNames] = useState(() => uniqueLenders(lenders));
  const [value, setValue] = useState(defaultLender ?? "");
  const [adding, setAdding] = useState(!defaultLender && lenders.length === 0);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitted = adding ? newName : value;

  function remember(name: string) {
    const next = uniqueLenders([...names, name]);
    setNames(next);
    onLendersChange?.(next);
    setValue(name);
    setAdding(false);
    setNewName("");
    setError(null);
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`${idPrefix}-lender-select`}>Lender</Label>
      <Select
        value={adding ? ADD_LENDER : value || null}
        onValueChange={(next) => {
          if (next === ADD_LENDER) {
            setAdding(true);
            setValue("");
            setError(null);
            return;
          }
          if (typeof next === "string") {
            setAdding(false);
            setValue(next);
            setNewName("");
            setError(null);
          }
        }}
      >
        <SelectTrigger id={`${idPrefix}-lender-select`} className="w-full">
          <SelectValue placeholder="Select a lender" />
        </SelectTrigger>
        <SelectContent align="start" className="min-w-(--anchor-width)">
          {names.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
          {names.length > 0 ? <SelectSeparator /> : null}
          <SelectItem value={ADD_LENDER}>Add lender</SelectItem>
        </SelectContent>
      </Select>
      <input type="hidden" name="lender" value={submitted} />
      {adding ? (
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-lender`}
            value={newName}
            maxLength={80}
            placeholder="Lender name"
            autoComplete="off"
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              const formData = new FormData();
              formData.set("lender", newName);
              startTransition(async () => {
                const result = await addLender(formData);
                if (!result.ok) {
                  setError(result.message);
                  toast.error(result.message);
                  return;
                }
                remember(result.name);
                toast.success("Lender added");
              });
            }}
          >
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function LiabilityFields({
  idPrefix,
  lenders,
  onLendersChange,
  lenderDefault,
  amountDefault,
  dateDefault,
  noteDefault,
  amountHint,
}: {
  idPrefix: string;
  lenders: string[];
  onLendersChange?: (names: string[]) => void;
  lenderDefault?: string;
  amountDefault?: string;
  dateDefault: string;
  noteDefault?: string;
  amountHint?: string;
}) {
  const today = useTodayDhaka();

  return (
    <>
      <LenderPicker
        idPrefix={idPrefix}
        lenders={lenders}
        defaultLender={lenderDefault}
        onLendersChange={onLendersChange}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-amount`}>Amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            id={`${idPrefix}-amount`}
            name="amount"
            inputMode="decimal"
            step="0.01"
            required
            defaultValue={amountDefault}
            placeholder="0.00"
            className="pl-6 tabular-nums"
          />
        </div>
        {amountHint ? (
          <p className="text-xs text-muted-foreground">{amountHint}</p>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-date`}>Date received</Label>
        <Input
          id={`${idPrefix}-date`}
          key={dateDefault || today || `${idPrefix}-date`}
          name="borrowed_on"
          type="date"
          required
          defaultValue={dateDefault}
          max={today || undefined}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-note`}>Note (optional)</Label>
        <Input
          id={`${idPrefix}-note`}
          name="note"
          defaultValue={noteDefault}
          placeholder="Reason, terms…"
        />
      </div>
    </>
  );
}

function RepaymentFields({
  idPrefix,
  amountDefault,
  dateDefault,
  noteDefault,
  minDate,
  amountHint,
}: {
  idPrefix: string;
  amountDefault?: string;
  dateDefault: string;
  noteDefault?: string;
  minDate: string;
  amountHint?: string;
}) {
  const today = useTodayDhaka();

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-amount`}>Amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            id={`${idPrefix}-amount`}
            name="amount"
            inputMode="decimal"
            step="0.01"
            required
            defaultValue={amountDefault}
            placeholder="0.00"
            className="pl-6 tabular-nums"
          />
        </div>
        {amountHint ? (
          <p className="text-xs text-muted-foreground">{amountHint}</p>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-date`}>Date repaid</Label>
        <Input
          id={`${idPrefix}-date`}
          key={dateDefault || today || `${idPrefix}-date`}
          name="repaid_on"
          type="date"
          required
          defaultValue={dateDefault}
          min={minDate}
          max={today || undefined}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-note`}>Note (optional)</Label>
        <Input
          id={`${idPrefix}-note`}
          name="note"
          defaultValue={noteDefault}
          placeholder="Partial, cash…"
        />
      </div>
    </>
  );
}

export function LiabilityForm({ lenders }: { lenders: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [names, setNames] = useState(() => uniqueLenders(lenders));
  const [pickerKey, setPickerKey] = useState(0);
  const today = useTodayDhaka();

  return (
    <form
      ref={formRef}
      className="grid gap-3"
      action={(formData) => {
        startTransition(async () => {
          const result = await addLiability(formData);
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          const added = String(formData.get("lender") ?? "");
          if (added.trim()) setNames((current) => uniqueLenders([...current, added]));
          setError(null);
          toast.success("Loan recorded");
          const amount = formRef.current?.elements.namedItem("amount");
          const note = formRef.current?.elements.namedItem("note");
          if (amount instanceof HTMLInputElement) amount.value = "";
          if (note instanceof HTMLInputElement) note.value = "";
          setPickerKey((key) => key + 1);
        });
      }}
    >
      <LiabilityFields
        key={pickerKey}
        idPrefix="liability"
        lenders={names}
        onLendersChange={setNames}
        dateDefault={today}
        amountHint="This adds cash on hand. It is not profit. Dates before the opening-cash counted-on day stay recorded but do not move cash."
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add loan"}
        </Button>
      </div>
    </form>
  );
}

export function EditLiabilityButton({
  row,
  lenders,
}: {
  row: LiabilityBalance;
  lenders: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(formData: FormData) {
    formData.set("id", String(row.id));
    startTransition(async () => {
      const result = await updateLiability(formData);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      setOpen(false);
      toast.success("Loan updated");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Edit loan from ${row.lender}`}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Edit
      </Button>
      {open ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!pending) setOpen(next);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <form className="grid gap-4" action={save}>
              <DialogHeader>
                <DialogTitle>Edit loan</DialogTitle>
                <DialogDescription>
                  Principal cannot go below {formatBdt(row.repaid)} already
                  repaid. Changing the date updates whether this loan counts
                  toward cash on hand.
                </DialogDescription>
              </DialogHeader>
              <LiabilityFields
                idPrefix={`liability-${row.id}`}
                lenders={uniqueLenders([...lenders, row.lender])}
                lenderDefault={row.lender}
                amountDefault={amountInputValue(row.principal)}
                dateDefault={dateInputValue(row.borrowed_on)}
                noteDefault={row.note ?? undefined}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export function DeleteLiabilityButton({ row }: { row: LiabilityBalance }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Delete loan from ${row.lender}`}
      onClick={() => {
        if (row.repaid > 0) {
          const ok = window.confirm(
            `Delete this loan from ${row.lender}? ${formatBdt(row.repaid)} in repayments will also be removed, and cash on hand will change.`,
          );
          if (!ok) return;
        }
        startTransition(async () => {
          const result = await deleteLiability(row.id);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Loan deleted");
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function RepayLiabilityButton({
  row,
  cashOnHand,
}: {
  row: LiabilityBalance;
  cashOnHand: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = useTodayDhaka();

  if (row.remaining <= 0) return null;

  function save(formData: FormData) {
    formData.set("liability_id", String(row.id));
    startTransition(async () => {
      const result = await addRepayment(formData);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      setOpen(false);
      toast.success("Repayment recorded");
    });
  }

  const cashHint =
    cashOnHand == null
      ? `Remaining ${formatBdt(row.remaining)}. Add opening cash to track cash on hand.`
      : `Remaining ${formatBdt(row.remaining)}. Cash on hand ${formatBdt(cashOnHand)}. This lowers cash, not profit.`;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Repay ${row.lender}`}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Repay
      </Button>
      {open ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!pending) setOpen(next);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <form className="grid gap-4" action={save}>
              <DialogHeader>
                <DialogTitle>Repay {row.lender}</DialogTitle>
                <DialogDescription>
                  Pays down this loan from cash. Dates before the opening-cash
                  counted-on day stay recorded but do not move cash.
                </DialogDescription>
              </DialogHeader>
              <RepaymentFields
                idPrefix={`repay-${row.id}`}
                amountDefault={amountInputValue(row.remaining)}
                dateDefault={today}
                minDate={dateInputValue(row.borrowed_on)}
                amountHint={cashHint}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Record repayment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export function LiabilityRepaymentsButton({
  row,
  repayments,
}: {
  row: LiabilityBalance;
  repayments: LiabilityRepayment[];
}) {
  const [open, setOpen] = useState(false);

  if (row.repaid <= 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Repayments to ${row.lender}`}
        onClick={() => setOpen(true)}
      >
        History
      </Button>
      {open ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Repayments to {row.lender}</DialogTitle>
              <DialogDescription>
                {formatBdt(row.repaid)} repaid of {formatBdt(row.principal)}
              </DialogDescription>
            </DialogHeader>
            <ul className="grid gap-3">
              {repayments.map((repayment) => (
                <li
                  key={repayment.id}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="grid gap-0.5 text-sm">
                    <span className="tabular-nums font-medium">
                      {formatBdt(
                        typeof repayment.amount === "number"
                          ? repayment.amount
                          : Number(repayment.amount),
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {dateInputValue(repayment.repaid_on)}
                      {repayment.note ? ` · ${repayment.note}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <EditRepaymentButton loan={row} repayment={repayment} />
                    <DeleteRepaymentButton
                      id={repayment.id}
                      label={`${formatBdt(Number(repayment.amount))} on ${dateInputValue(repayment.repaid_on)}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function EditRepaymentButton({
  loan,
  repayment,
}: {
  loan: LiabilityBalance;
  repayment: LiabilityRepayment;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const amount =
    typeof repayment.amount === "number"
      ? repayment.amount
      : Number(repayment.amount);
  const remainingIfRemoved =
    Math.round((loan.remaining + amount) * 100) / 100;

  function save(formData: FormData) {
    formData.set("id", String(repayment.id));
    formData.set("liability_id", String(loan.id));
    startTransition(async () => {
      const result = await updateRepayment(formData);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      setOpen(false);
      toast.success("Repayment updated");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Edit repayment on ${dateInputValue(repayment.repaid_on)}`}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Edit
      </Button>
      {open ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!pending) setOpen(next);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <form className="grid gap-4" action={save}>
              <DialogHeader>
                <DialogTitle>Edit repayment</DialogTitle>
                <DialogDescription>
                  Up to {formatBdt(remainingIfRemoved)} including this
                  repayment.
                </DialogDescription>
              </DialogHeader>
              <RepaymentFields
                idPrefix={`repayment-${repayment.id}`}
                amountDefault={amountInputValue(amount)}
                dateDefault={dateInputValue(repayment.repaid_on)}
                noteDefault={repayment.note ?? undefined}
                minDate={dateInputValue(loan.borrowed_on)}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function DeleteRepaymentButton({
  id,
  label,
}: {
  id: number;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Delete ${label}`}
      onClick={() => {
        startTransition(async () => {
          const result = await deleteRepayment(id);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Repayment deleted");
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
