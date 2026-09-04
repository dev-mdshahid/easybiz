"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createBusiness,
  deleteBusiness,
  setCurrentBusiness,
} from "@/app/business-actions";
import type { Business } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OpeningBalanceFields } from "@/components/opening-balance-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BusinessSwitcher({
  businesses,
  current,
}: {
  businesses: Business[];
  current: Business | null;
}) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectBusiness(id: number) {
    startTransition(async () => {
      await setCurrentBusiness(id);
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const name = pendingDelete.name;
    const id = pendingDelete.id;
    startTransition(async () => {
      const result = await deleteBusiness(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setPendingDelete(null);
      toast.success(`${name} deleted`);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1 px-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground">
          EasyBiz
        </span>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="h-8 w-full justify-between px-2 text-sm font-semibold"
                disabled={pending}
                suppressHydrationWarning
              />
            }
          >
            <span className="truncate">{current?.name ?? "Select a business"}</span>
            <ChevronsUpDown className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Businesses</DropdownMenuLabel>
              {businesses.length === 0 ? (
                <p className="px-1.5 py-1 text-sm text-muted-foreground">
                  No businesses yet
                </p>
              ) : (
                businesses.map((business) => (
                  <DropdownMenuItem
                    key={business.id}
                    closeOnClick={false}
                    className="pr-1"
                    onClick={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.target.closest('[data-slot="delete-business"]')
                      ) {
                        return;
                      }
                      setMenuOpen(false);
                      selectBusiness(business.id);
                    }}
                  >
                    <span className="flex-1 truncate">{business.name}</span>
                    {current?.id === business.id ? (
                      <Check className="size-3.5" />
                    ) : null}
                    <span
                      role="button"
                      tabIndex={0}
                      data-slot="delete-business"
                      aria-label={`Delete ${business.name}`}
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setMenuOpen(false);
                        setPendingDelete(business);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          setMenuOpen(false);
                          setPendingDelete(business);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Create business
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {createOpen ? (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <form
              className="grid gap-4"
              action={(formData) => {
                startTransition(async () => {
                  const result = await createBusiness(formData);
                  if (!result.ok) {
                    setError(result.message);
                    toast.error(result.message);
                    return;
                  }
                  setError(null);
                  setCreateOpen(false);
                  toast.success("Business created");
                });
              }}
            >
              <DialogHeader>
                <DialogTitle>New business</DialogTitle>
                <DialogDescription>
                  Orders, uploads, and Pathao CSVs stay inside this business.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="business-name">Name</Label>
                <Input
                  id="business-name"
                  name="name"
                  required
                  placeholder="e.g. Shazelle"
                  autoFocus
                />
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
              </div>
              <OpeningBalanceFields required={false} optionalHint />
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {pendingDelete ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !pending) setPendingDelete(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {pendingDelete.name}?</DialogTitle>
              <DialogDescription>
                All invoices and CSV upload history for this business will be
                permanently removed. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={pending} />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={confirmDelete}
              >
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
