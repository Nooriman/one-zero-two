import { formatAmount, type DebtRecord } from "../../../api/DebtApi";

type DebtCardProps = {
  debt: DebtRecord;
  onOpen: () => void;
};

function DebtCard({ debt, onOpen }: DebtCardProps) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-graphite-700 bg-graphite-900 p-4 text-left transition active:scale-[0.98]"
      onClick={onOpen}
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-sm text-graphite-300">Me → {debt.person}</span>
        <span className="block truncate text-base">{debt.description || "No description"}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-semibold">{formatAmount(debt.amount)}</span>
        <span className={"block text-xs font-semibold " + (debt.paidAt ? "text-graphite-300" : "text-orange")}>
          {debt.paidAt ? `Paid on ${new Date(debt.paidAt).toLocaleDateString()}` : "Unpaid"}
        </span>
      </span>
    </button>
  );
}

export default DebtCard;
