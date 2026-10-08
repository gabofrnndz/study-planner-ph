// Grading policy data. Source: published summaries of DepEd Order No. 015, s. 2026.
// verified:false because the official PDF has not been checked line by line. Confirm every value before relying on it.
const POLICY = {
  verified: false,
  note: "Weights and the adjusted SY 2026-2027 transmutation table come from secondary summaries of DO 015, s. 2026. Table values below about 42 are extrapolated. Confirm with the official issuance and your teacher.",
  examSplit: [0.3, 0.3, 0.4], // Summative Test 1, Summative Test 2, Term Examination
  groups: [
    { name: "SHS Core / Academic electives", w: { ww: 20, pt: 50, ex: 30 }, src: "DO 015, s. 2026 (SHS)" },
    { name: "SHS TechPro electives", w: { ww: 15, pt: 65, ex: 20 }, src: "DO 015, s. 2026 (SHS)" },
    { name: "SHS Work Immersion", w: { ww: 20, pt: 80, ex: 0 }, src: "DO 015, s. 2026 (SHS)" },
    { name: "Grade 12 old curriculum: Core (DO 8 weights)", w: { ww: 25, pt: 50, ex: 25 }, src: "DO 8, s. 2015 weights kept for Grade 12 in SY 2026-2027" }
  ],
  // Initial grade >= 70: 75 + one grade per 1.18 points, 99.50 and above = 100.
  step: 1.18, base: 70, basePass: 75,
  // Initial grade lower bounds for transmuted 74 down to 61; below the last bound = 60.
  below70: [[65.34, 74], [60.67, 73], [56.01, 72], [51.34, 71], [46.67, 70], [42.01, 69], [37.34, 68], [32.67, 67], [28.01, 66], [23.34, 65], [18.67, 64], [14.01, 63], [9.34, 62], [4.67, 61]],
  passing: 75, minGrade: 60,
  descriptors: [[90, "Advancing"], [80, "Benchmarking"], [75, "Connecting"], [65, "Developing"], [0, "Emerging"]]
};
