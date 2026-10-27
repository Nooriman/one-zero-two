import { createLiability, deleteLiability, listLiabilities, updateLiability } from "../../api/LiabilityApi";
import AmountList from "../../components/AmountList";
import { monthName, nextMonthStart } from "../../lib/month";

/** Monthly liabilities we both have to pay regardless of day-to-day expenses. */
function Liabilities({ onBack }: { onBack: () => void }) {
  const next = monthName(nextMonthStart());

  return (
    <AmountList
      create={createLiability}
      list={listLiabilities}
      noun="liability"
      onBack={onBack}
      remove={deleteLiability}
      saveNotice={{
        title: `Changes start in ${next}`,
        message: `Any changes to your liabilities, including amounts and added or removed items, will only take effect from ${next}. This month stays as it is.`,
      }}
      title="Liabilities"
      update={updateLiability}
    />
  );
}

export default Liabilities;
