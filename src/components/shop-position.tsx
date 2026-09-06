import type { CashPosition, StockPosition } from "@/app/actions";
import { CashPositionCard } from "@/components/cash-position";
import { LiabilityPositionCard } from "@/components/liability-position";
import { StockPositionCard } from "@/components/stock-position";
import { Card } from "@/components/ui/card";
import { formatBdt, formatBdtCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

function Composition({
  cash,
  stock,
  owe,
}: {
  cash: number;
  stock: number;
  owe: number;
}) {
  const assets = Math.max(0, cash) + Math.max(0, stock);
  const scale = Math.max(assets, Math.abs(owe), 1);
  const cashShare = (Math.max(0, cash) / scale) * 100;
  const stockShare = (Math.max(0, stock) / scale) * 100;
  const oweShare = (Math.abs(owe) / scale) * 100;

  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Cash + stock</span>
          <span className="tabular-nums">{formatBdtCompact(assets)}</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="bg-primary"
            style={{ width: `${cashShare}%` }}
            title={`Cash ${formatBdt(cash)}`}
          />
          <div
            className="bg-[var(--chart-2)]"
            style={{ width: `${stockShare}%` }}
            title={`Stock ${formatBdt(stock)}`}
          />
        </div>
      </div>
      <div className="grid gap-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Unpaid loans</span>
          <span className="tabular-nums">{formatBdtCompact(owe)}</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="bg-destructive/80"
            style={{ width: `${oweShare}%` }}
            title={`You owe ${formatBdt(owe)}`}
          />
        </div>
      </div>
    </div>
  );
}

export function ShopPosition({
  cash,
  stock,
  hasBusiness,
}: {
  cash: CashPosition;
  stock: StockPosition;
  hasBusiness: boolean;
}) {
  const cashValue =
    cash.is_set && cash.cash_on_hand != null ? cash.cash_on_hand : null;
  const stockValue =
    stock.is_set && stock.stock_on_hand != null ? stock.stock_on_hand : null;
  const working =
    cashValue != null && stockValue != null
      ? cashValue + stockValue - cash.liabilities_outstanding
      : null;

  return (
    <Card className="py-0 [--card-spacing:0px]">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="grid gap-0.5">
          <h2 className="text-base font-semibold">On hand</h2>
          <p className="text-xs text-muted-foreground">Cash + stock − loans</p>
        </div>
        {working != null ? (
          <p
            className={cn(
              "font-heading text-2xl font-semibold tracking-tight tabular-nums",
              working < 0 && "text-destructive",
            )}
          >
            {formatBdt(working)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>

      {cashValue != null && stockValue != null ? (
        <div className="px-4 pt-4">
          <Composition
            cash={cashValue}
            stock={stockValue}
            owe={cash.liabilities_outstanding}
          />
        </div>
      ) : (
        <p className="px-4 pt-3 text-sm text-muted-foreground">
          Add opening cash and stock to see what the shop holds after loans.
        </p>
      )}

      <div className="flex flex-col px-4 pt-3 pb-4">
        <CashPositionCard cash={cash} hasBusiness={hasBusiness} variant="row" />
        <StockPositionCard
          stock={stock}
          hasBusiness={hasBusiness}
          variant="row"
        />
        <LiabilityPositionCard
          cash={cash}
          hasBusiness={hasBusiness}
          variant="row"
        />
      </div>
    </Card>
  );
}
