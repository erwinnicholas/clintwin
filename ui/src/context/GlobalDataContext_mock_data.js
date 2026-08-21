export const initialMetrics = {
  total: 12842,
  eligible: 1348,
  review: 732,
  notEligible: 10762,
  unprocessed: 0
};

export const initialMonitoringStats = {
  critical: 2,
  high: 8,
  medium: 15,
  info: 42
};

export const aiPatientTrialMatchingMock = {
  title: "AI Patient-Trial Matching",
  subtitle: "Automated screening & matching via EMR/Lab extraction",
  series: [
    { dataKey: "screened", name: "EMR Screened", color: "var(--text-muted)" },
    { dataKey: "matched", name: "Eligible Matched", color: "var(--accent-blue)" },
    { dataKey: "enrolled", name: "Trials Enrolled", color: "var(--accent-green)" }
  ],
  data: [
    { month: 'Jan', screened: 4000, matched: 1200, enrolled: 400 },
    { month: 'Feb', screened: 5000, matched: 1500, enrolled: 550 },
    { month: 'Mar', screened: 4500, matched: 1400, enrolled: 500 },
    { month: 'Apr', screened: 6000, matched: 2100, enrolled: 800 },
    { month: 'May', screened: 7500, matched: 2800, enrolled: 1100 },
    { month: 'Jun', screened: 8200, matched: 3200, enrolled: 1400 },
  ]
};

export const researchDocumentIntelligenceMock = {
  title: "Research Document Intelligence",
  subtitle: "Criteria extraction & regulatory compliance verification velocity",
  series: [
    { dataKey: "parsed", name: "Docs Parsed", color: "var(--accent-purple)" },
    { dataKey: "extracted", name: "Criteria Extracted", color: "var(--accent-yellow)" },
    { dataKey: "verified", name: "Compliance Verified", color: "var(--accent-green)" }
  ],
  data: [
    { week: 'W1', parsed: 1200, extracted: 800, verified: 400 },
    { week: 'W2', parsed: 1500, extracted: 1100, verified: 600 },
    { week: 'W3', parsed: 2000, extracted: 1500, verified: 900 },
    { week: 'W4', parsed: 2800, extracted: 2200, verified: 1400 },
    { week: 'W5', parsed: 3900, extracted: 3100, verified: 2100 },
  ]
};
