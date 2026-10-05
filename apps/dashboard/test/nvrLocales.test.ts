// [fork] HAPulse translates the shared package's nvr.* keys with its OWN dictionaries (nvr/ui.tsx) — a key the package
// adds but HAPulse lacks shows up raw in the UI (happened with the 0.14.0 PiP note). Every package key must exist here.
// The texts must also be the SAME as the package's (Sentinel shows the package's own dictionaries): HAPulse leads, a
// package update that changes a text either takes HAPulse's wording or both change together.
import { describe, expect, it } from "vitest";
import pkgDe from "@sentinel-nvr/web/ui/locales/de.json";
import pkgEn from "@sentinel-nvr/web/ui/locales/en.json";
import pkgEs from "@sentinel-nvr/web/ui/locales/es.json";
import pkgFr from "@sentinel-nvr/web/ui/locales/fr.json";
import pkgIt from "@sentinel-nvr/web/ui/locales/it.json";
import pkgPt from "@sentinel-nvr/web/ui/locales/pt.json";
import pkgSv from "@sentinel-nvr/web/ui/locales/sv.json";
import de from "../../../packages/core/locales/de.json";
import en from "../../../packages/core/locales/en.json";
import es from "../../../packages/core/locales/es.json";
import fr from "../../../packages/core/locales/fr.json";
import it_ from "../../../packages/core/locales/it.json";
import pt from "../../../packages/core/locales/pt.json";
import sv from "../../../packages/core/locales/sv.json";

type Dict = Record<string, string>;
const PAIRS: [string, Dict, Dict][] = [
  ["de", pkgDe, de],
  ["en", pkgEn, en],
  ["es", pkgEs, es],
  ["fr", pkgFr, fr],
  ["it", pkgIt, it_],
  ["pt", pkgPt, pt],
  ["sv", pkgSv, sv],
];

describe("@sentinel-nvr/web keys in HAPulse locales", () => {
  it("every nvr.* key of the package exists in HAPulse (en; the core smoke test keeps all locales in parity)", () => {
    const missing = Object.keys(pkgEn).filter(
      (k) => k.startsWith("nvr.") && !(k in en),
    );
    expect(missing).toEqual([]);
  });

  it.each(PAIRS)(
    "%s: every nvr.* text equals the package text (Sentinel and HAPulse read alike)",
    (_lang, pkg, own) => {
      const differ = Object.keys(pkg)
        .filter((k) => k.startsWith("nvr.") && k in own && own[k] !== pkg[k])
        .map((k) => `${k}: "${own[k]}" ≠ package "${pkg[k]}"`);
      expect(differ).toEqual([]);
    },
  );
});
