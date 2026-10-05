export type GuideSection = { title: string; body: string };

const POLICIES: GuideSection = {
  title: "Ask about policies",
  body: "Ask in plain language about procurement rules, thresholds, or how a process should run. Kasuku answers from indexed institutional documents.",
};

const SCOPE: GuideSection = {
  title: "Stay inside this tab",
  body: "This chat is scoped to the app you opened. Ask about the KPIs and tables that belong to this lifecycle stage.",
};

const GUIDES: Record<string, GuideSection[]> = {
  LANDING_PAGE: [
    { title: "Ask for a snapshot", body: "Ask what last synced, how many active providers there are, or for an entity-wide overview." },
  ],
  PROVIDER_REG: [
    { title: "Ask about providers", body: "Ask for active, suspended, or SIG providers. Name a region or sector if you have one." },
  ],
  PLANNING: [
    { title: "Ask about plans", body: "Ask about plan approval, publication status, amendments, or this financial year." },
  ],
  INITIATION: [
    { title: "Ask about initiations", body: "Ask how many requisitions are late, or to summarise initiations for this PDE." },
  ],
  SOLICITATION: [
    { title: "Ask about bids", body: "Ask about average bids by method, or open solicitations." },
  ],
  EVALUATION: [
    { title: "Ask about evaluation", body: "Ask about due diligence status or evaluator progress." },
  ],
  CONTRACTING: [
    { title: "Ask about awards", body: "Ask how many contracts were awarded, by PDE or method, this financial year." },
  ],
  CONTRACT_MGMT: [
    { title: "Ask about contract records", body: "Ask about completed, terminated, or on-time contracts." },
  ],
  DISPOSAL: [
    { title: "Ask about disposal", body: "Ask about disposal methods or planned disposals." },
  ],
  SUPPLIER_PORTAL: [
    { title: "Ask about the portal", body: "Ask about suspended providers or portal activity." },
  ],
  REVENUE: [
    { title: "Ask about revenue", body: "Ask what was collected versus pending this financial year." },
  ],
  COLLABORATIVE: [
    { title: "Ask about frameworks", body: "Ask about collaborative performance or call-off orders." },
  ],
  SIG: [
    { title: "Ask about SIG", body: "Ask for the SIG summary or reserved procurement totals." },
  ],
};

export function getAskGuide(appCode: string): { title: string; sections: GuideSection[] } {
  return {
    title: "How to ask EGP 2.0 KASUKU",
    sections: [...(GUIDES[appCode] || []), SCOPE, POLICIES],
  };
}
