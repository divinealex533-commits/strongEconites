// Shared rules used by both the browser and the API routes.

export const DEFAULT_PREFIXES = "EDU, B1";
export const MATRIC_EMAIL_DOMAIN = "students.econites.app";

export const normMatric = (s) => String(s || "").toUpperCase().replace(/[\s\/-]+/g, "");

// UNIBEN formats: EDU + 7 digits (EDU24*****) or B + 7 digits (B1******)
export function matricOk(matric, prefixes = DEFAULT_PREFIXES) {
  const m = normMatric(matric);
  const list = String(prefixes || DEFAULT_PREFIXES)
    .split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
  return /^(EDU\d{7}|B\d{7})$/.test(m) && list.some((p) => m.startsWith(p));
}

// Supabase Auth needs an email, so each matric number gets a private sign-in address.
export const matricEmail = (matric) => `${normMatric(matric).toLowerCase()}@${MATRIC_EMAIL_DOMAIN}`;

export const DEPTS = [
  "Social Science Education", "Educational Management", "Educational Foundations",
  "Curriculum & Instructional Technology", "Educational Evaluation & Counselling Psychology",
  "Health, Environmental Education & Human Kinetics", "Science Education", "Arts Education",
  "Vocational & Technical Education", "Adult & Non-Formal Education", "Library & Information Science", "Other",
];
export const LEVELS = ["100L", "200L", "300L", "400L", "500L"];
export const ROLES = ["Student", "Class rep", "Assistant class rep", "Course rep"];
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const DEFAULT_WELCOME =
  "Welcome to {class}, {name}! You're now part of the family. Join our class group so you never miss a lecture change, test date or update.";

export const PAGES = [
  ["home", "Home"], ["me", "My Dashboard"], ["chat", "Class Chat"], ["study", "Study Hub"],
  ["gpa", "CGPA Calculator"], ["gallery", "Class Gallery"], ["about", "Know UNIBEN"], ["news", "Announcements"], ["timetable", "Timetable & Events"],
  ["class", "Classmates"], ["notes", "Notes & Assignments"], ["links", "School Links"], ["manage", "Manage Site"],
];

// Nigerian 5-point scale
export function grade(score) {
  if (score === "" || score == null || isNaN(+score)) return null;
  const s = +score;
  if (s >= 70) return ["A", 5]; if (s >= 60) return ["B", 4]; if (s >= 50) return ["C", 3];
  if (s >= 45) return ["D", 2]; if (s >= 40) return ["E", 1]; return ["F", 0];
}
export function gpaOf(courses = []) {
  let u = 0, p = 0;
  for (const c of courses) { const g = grade(c.score); if (g) { u += +c.units || 0; p += (+c.units || 0) * g[1]; } }
  return u ? Math.round((p / u) * 100) / 100 : null;
}
export function degreeClass(g) {
  if (g == null) return "";
  if (g >= 4.5) return "First Class"; if (g >= 3.5) return "Second Class Upper";
  if (g >= 2.4) return "Second Class Lower"; if (g >= 1.5) return "Third Class";
  if (g >= 1) return "Pass"; return "Below pass";
}

export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "");
export const todayISO = () => {
  const d = new Date(); const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};
export function fmtDate(d) {
  if (!d) return "";
  const x = new Date(String(d).length === 10 ? d + "T12:00:00" : d);
  return isNaN(x) ? String(d) : x.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
export const firstName = (full) => String(full || "").trim().split(/\s+/).slice(-1)[0] || "Econite";
