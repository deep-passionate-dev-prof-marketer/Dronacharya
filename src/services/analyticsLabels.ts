/** Human labels for analytics dimensions (shared by the server and the dashboard). */
import { KIND_LABEL, ClassKind } from "./classLabels";
import { CURRICULA_MAP, LEARNING_FLOWW_COURSES } from "./linkNomenclatureService";
import { ISO3_TO_ISO2 } from "../routing/appRoutes";

const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const languageNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "language" }) : null;

export function countryName(iso3: string | null | undefined): string {
  if (!iso3) return "Unknown";
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
  try {
    return (iso2 && regionNames?.of(iso2)) || iso3;
  } catch {
    return iso3;
  }
}

export function kindName(kind: string): string {
  if (kind === "adhoc") return "Ad-hoc session";
  return KIND_LABEL[kind as ClassKind] || kind;
}

export function programName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  return (CURRICULA_MAP as any)[code]?.name || (LEARNING_FLOWW_COURSES as any)[code]?.name || code;
}

export function languageName(tag: string | null | undefined): string {
  if (!tag) return "Unknown";
  try {
    return languageNames?.of(tag) || tag;
  } catch {
    return tag;
  }
}

export const analyticsLabels = { country: countryName, kind: kindName, program: programName, language: languageName };
