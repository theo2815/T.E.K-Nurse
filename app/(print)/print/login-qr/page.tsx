import { notFound } from "next/navigation";
import { PrintLoginCard } from "@/components/qr/PrintLoginCard";
import { PrintToolbar } from "@/components/qr/PrintToolbar";

const LOGIN_URL = "https://teknurse.vercel.app/login";

export default function PrintLoginQrPage() {
  // Dev-only artifact — one-off demo poster, not a shipped feature.
  // Production / preview builds 404 even for staff.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <PrintToolbar
        backHref="/staff"
        backLabel="Back to dashboard"
        title="Panel access QR"
        subtitle="Single card · A4 sheet · scan to log in"
        downloadable={{ url: LOGIN_URL, filename: "tek-nurse-login-qr.png" }}
      />

      <section
        className="bg-mist print:bg-white mx-auto flex items-center justify-center"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm",
          boxSizing: "border-box",
        }}
      >
        <PrintLoginCard url={LOGIN_URL} />
      </section>
    </>
  );
}
