"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import QRCode from "qrcode";

import { createQrLinkAction, deleteQrLinkAction, type QrActionState } from "@/app/qr-menu/actions";
import type { QrLink, QrManagementData } from "@/lib/qr/types";

const initialState: QrActionState = { status: "idle", message: "" };

function ActionMessage({ state }: { state: QrActionState }) {
  if (!state.message) return null;

  return (
    <div
      className={`rounded-sm px-4 py-3 text-sm ${
        state.status === "success"
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </div>
  );
}

function QrCodeCard({
  link,
  restaurantName,
  logoUrl,
  canManage,
  onDelete,
  isDeleting,
}: {
  link: QrLink;
  restaurantName: string;
  logoUrl: string | null;
  canManage: boolean;
  onDelete: (linkId: string) => void;
  isDeleting: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(link.destination_url, {
      margin: 2,
      width: 320,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    }).then((value) => {
      if (active) setQrDataUrl(value);
    });

    return () => {
      active = false;
    };
  }, [link.destination_url]);

  return (
    <article className="rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="grid place-items-center rounded-sm bg-[#FBFAF7] p-4 ring-1 ring-slate-200">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code" className="h-40 w-40" />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-sm bg-slate-100" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-[#D4A017]/10 px-2.5 py-1 text-xs font-semibold text-[#8A6811]">
              {link.destination_type === "restaurant" ? "Restaurant Menu" : "Specific Menu"}
            </span>
            {link.table_number ? (
              <span className="rounded-sm bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Table {link.table_number}
              </span>
            ) : null}
          </div>
          <p className="mt-3 break-all text-sm leading-6 text-slate-600">{link.destination_url}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={qrDataUrl || "#"}
              download={`atlas-${link.destination_type}-qr.png`}
              className="inline-flex min-h-10 items-center justify-center rounded-sm bg-[#0F172A] px-4 text-sm font-semibold text-white"
            >
              Download PNG
            </a>
            <a
              href={`/qr-menu/print/${encodeURIComponent(link.id)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-sm border border-slate-300 px-4 text-sm font-semibold text-[#0F172A]"
            >
              Print Card
            </a>
            <button
              type="button"
              disabled={!canManage || isDeleting}
              onClick={() => onDelete(link.id)}
              className="inline-flex min-h-10 items-center justify-center rounded-sm border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Deleting removes this QR link from Atlas. It does not delete the menu or restaurant.
          </p>
        </div>
        <div className="w-full rounded-sm border border-slate-200 bg-white p-5 text-center lg:w-64">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="mx-auto h-12 w-12 object-contain" />
          ) : (
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-sm bg-[#0F172A] text-sm font-semibold text-white">
              {restaurantName.slice(0, 1)}
            </div>
          )}
          <p className="mt-4 text-xs font-semibold uppercase text-slate-500">Scan to view our menu</p>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" className="mx-auto mt-3 h-32 w-32" />
          ) : null}
          {link.table_number ? <p className="mt-3 text-sm font-semibold">Table {link.table_number}</p> : null}
          <p className="mt-4 text-xs text-slate-500">Powered by Atlas</p>
        </div>
      </div>
    </article>
  );
}

export function QrMenuManagement({ data }: { data: QrManagementData }) {
  const [state, formAction, pending] = useActionState(createQrLinkAction, initialState);
  const [deleteState, setDeleteState] = useState<QrActionState>(initialState);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();
  const [destinationType, setDestinationType] = useState<"restaurant" | "menu">("restaurant");
  const restaurantUrl = `${data.origin}/r/${data.restaurant.slug}`;
  const hasPublishedMenus = data.publishedMenus.length > 0;
  const menuOptions = useMemo(() => data.publishedMenus, [data.publishedMenus]);
  const qrLinks = useMemo(
    () => data.qrLinks.filter((link) => !deletedIds.has(link.id)),
    [data.qrLinks, deletedIds],
  );

  function handleDelete(linkId: string) {
    if (!window.confirm("Delete this QR code? Existing printed copies may stop working.")) {
      return;
    }

    setDeletingId(linkId);
    startDeleteTransition(() => {
      const formData = new FormData();
      formData.set("restaurantId", data.restaurant.id);
      formData.set("qrLinkId", linkId);

      void deleteQrLinkAction(initialState, formData)
        .then((result) => {
          setDeleteState(result);

          const deletedId = result.deletedId;
          if (result.status === "success" && deletedId) {
            setDeletedIds((current) => {
              const next = new Set(current);
              next.add(deletedId);
              return next;
            });
          }
        })
        .catch(() => {
          setDeleteState({ status: "error", message: "QR link could not be deleted." });
        })
        .finally(() => {
          setDeletingId(null);
        });
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-sm bg-[#0F172A] p-7 text-white shadow-sm sm:p-9">
        <p className="text-sm font-medium text-[#D4A017]">QR Menu</p>
        <h1 className="mt-3 text-4xl font-semibold">Generate customer-facing menu QR codes.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
          Create QR links for your restaurant menu page or for a specific published menu.
          QR publishing uses published Menu Management data only.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <aside className="space-y-5">
          <form action={formAction} className="space-y-4 rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <input type="hidden" name="restaurantId" value={data.restaurant.id} />
            <input type="hidden" name="restaurantSlug" value={data.restaurant.slug} />
            <label className="block text-sm font-semibold text-slate-700">
              Destination
              <select
                name="destinationType"
                value={destinationType}
                onChange={(event) => setDestinationType(event.target.value as "restaurant" | "menu")}
                className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="restaurant">Restaurant Public Menu Page</option>
                <option value="menu" disabled={!hasPublishedMenus}>Specific Published Menu</option>
              </select>
            </label>
            {destinationType === "menu" ? (
              <label className="block text-sm font-semibold text-slate-700">
                Published Menu
                <select name="menuId" required className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm">
                  <option value="">Select menu</option>
                  {menuOptions.map((menu) => (
                    <option key={menu.id} value={menu.id}>{menu.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-sm font-semibold text-slate-700">
              Table Number <span className="font-normal text-slate-400">Optional</span>
              <input
                name="tableNumber"
                placeholder="12"
                className="mt-2 w-full rounded-sm border border-slate-200 px-4 py-3 text-sm"
              />
            </label>
            <div className="rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
              Public restaurant URL: <span className="break-all font-semibold text-[#0F172A]">{restaurantUrl}</span>
            </div>
            <ActionMessage state={state} />
            <button
              disabled={pending || !data.canManage}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Generating..." : "Generate QR Link"}
            </button>
            {!data.canManage ? (
              <p className="text-xs leading-5 text-slate-500">Only restaurant owners can generate QR links.</p>
            ) : null}
          </form>
        </aside>

        <main className="space-y-5">
          <ActionMessage state={deleteState} />
          {qrLinks.length ? (
            qrLinks.map((link) => (
              <QrCodeCard
                key={link.id}
                link={link}
                restaurantName={data.restaurant.name}
                logoUrl={data.logoUrl}
                canManage={data.canManage}
                onDelete={handleDelete}
                isDeleting={deletingId === link.id}
              />
            ))
          ) : (
            <div className="rounded-sm bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
              <h2 className="text-2xl font-semibold">No QR links yet.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Generate a restaurant QR link once Menu Management has at least one published menu.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
