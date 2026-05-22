import { Fragment } from "react";

/**
 * A4 page layout that chunks any list of pre-rendered cards into 9-per-page
 * sheets with a CSS page break between each sheet. The cards themselves are
 * passed in as ReactNodes — typically `<PrintCard size="grid" … />` rendered
 * on the server, so the QR-generation cost is paid once at request time.
 *
 * Layout math (see vault: Reference/QR Best Practices.md):
 *   - A4: 210 × 297 mm
 *   - Sheet padding: 8mm each side
 *   - Inner usable: ~194 × 281 mm
 *   - 3 cols × 60mm + 2 gutters × 4mm = 188mm (centred horizontally)
 *   - 3 rows × 85mm + 2 gutters × 4mm = 263mm (fits within 281mm)
 *
 * @page CSS (size A4, margin 0) is set by the (print) route group layout.
 */
export function PrintSheet9Up({ cards }: { cards: React.ReactNode[] }) {
  if (cards.length === 0) return null;

  const pages: React.ReactNode[][] = [];
  for (let i = 0; i < cards.length; i += 9) {
    pages.push(cards.slice(i, i + 9));
  }

  return (
    <>
      {pages.map((page, pageIdx) => (
        <Fragment key={pageIdx}>
          <section
            className="bg-mist print:bg-white mx-auto flex flex-col items-center"
            style={{
              width: "210mm",
              height: "297mm",
              padding: "8mm",
              boxSizing: "border-box",
              breakAfter: pageIdx < pages.length - 1 ? "page" : "auto",
              pageBreakAfter: pageIdx < pages.length - 1 ? "always" : "auto",
            }}
          >
            <div
              className="grid grid-cols-3"
              style={{
                gap: "4mm",
                gridAutoRows: "85mm",
                width: "188mm",
              }}
            >
              {page}
            </div>

            <p
              className="font-mono uppercase text-caps-sm text-slate/60 mt-auto print:hidden"
              style={{ letterSpacing: "0.12em" }}
            >
              T·E·K NURSE · QR SHEET · {pageIdx + 1} / {pages.length}
            </p>
          </section>
        </Fragment>
      ))}
    </>
  );
}
