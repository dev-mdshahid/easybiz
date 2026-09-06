import type { CashPosition, StockPosition } from "@/app/actions";
import { CashPositionCard } from "@/components/cash-position";
import { LiabilityPositionCard } from "@/components/liability-position";
import { MetricBreakdown } from "@/components/metric-breakdown";
import { StockPositionCard } from "@/components/stock-position";
import { formatBdt, formatBdtCompact } from "@/lib/money";
import {
  ON_HAND_FORMULA,
  onHandRows,
  type LoanLedgerInput,
} from "@/lib/position-ledgers";
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
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-5">
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between text-sm text-current/70">
          <span>Cash + stock</span>
          <span className="tabular-nums tracking-tight">
            {formatBdtCompact(assets)}
          </span>
        </div>
        <div className="flex h-3.5 overflow-hidden rounded-full bg-current/15">
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
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between text-sm text-current/70">
          <span>Unpaid loans</span>
          <span className="tabular-nums tracking-tight">
            {formatBdtCompact(owe)}
          </span>
        </div>
        <div className="flex h-3.5 overflow-hidden rounded-full bg-current/15">
          <div
            className="bg-[oklch(0.78_0.14_25)]"
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
  loans,
  hasBusiness,
}: {
  cash: CashPosition;
  stock: StockPosition;
  loans: LoanLedgerInput[];
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
    <section className="flex h-full min-h-0 flex-col gap-5 overflow-hidden rounded-xl bg-foreground p-5 text-background shadow-[0_18px_40px_-28px_oklch(0.27_0.045_252_/_0.5)] sm:p-6">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <div className="flex items-center gap-1">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              On hand
            </h2>
            {cashValue != null && stockValue != null ? (
              <MetricBreakdown
                title="On hand"
                formula={ON_HAND_FORMULA}
                rows={onHandRows(
                  cashValue,
                  stockValue,
                  cash.liabilities_outstanding,
                )}
                tone="onWell"
              />
            ) : null}
          </div>
          <p className="text-sm text-current/70">Cash + stock − loans</p>
        </div>
        {working != null ? (
          <p
            className={cn(
              "font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl",
              working < 0 && "text-[oklch(0.82_0.12_25)]",
            )}
          >
            {formatBdt(working)}
          </p>
        ) : (
          <p className="text-sm text-current/70">—</p>
        )}
      </div>

      {cashValue != null && stockValue != null ? (
        <Composition
          cash={cashValue}
          stock={stockValue}
          owe={cash.liabilities_outstanding}
        />
      ) : (
        <p className="flex-1 text-sm text-current/70">
          Add opening cash and stock to see what the shop holds after loans.
        </p>
      )}

      <div className="flex shrink-0 flex-col">
        <CashPositionCard
          cash={cash}
          hasBusiness={hasBusiness}
          variant="row"
          tone="onWell"
        />
        <StockPositionCard
          stock={stock}
          hasBusiness={hasBusiness}
          variant="row"
          tone="onWell"
        />
        <LiabilityPositionCard
          cash={cash}
          loans={loans}
          hasBusiness={hasBusiness}
          variant="row"
          tone="onWell"
        />
      </div>
    </section>
  );
}
