"use client";

import { Equal } from "lucide-react";
import { useState } from "react";

import { LedgerList, type LedgerRow } from "@/components/ledger";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function MetricBreakdown({
  title,
  formula,
  rows,
  tone = "default",
}: {
  title: string;
  formula: string;
  rows: LedgerRow[];
  tone?: "default" | "onPrimary" | "onWell";
}) {
  const [open, setOpen] = useState(false);
  const onWell = tone === "onWell";
  const onPrimary = tone === "onPrimary";

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`How ${title} is calculated`}
              className={cn(
                onPrimary &&
                  "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                onWell &&
                  "text-current hover:bg-background/10 hover:text-current",
              )}
              onClick={() => setOpen(true)}
            />
          }
        >
          <Equal />
        </TooltipTrigger>
        <TooltipContent>How this number is calculated</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{formula}</DialogDescription>
          </DialogHeader>
          <LedgerList rows={rows} />
        </DialogContent>
      </Dialog>
    </>
  );
}
