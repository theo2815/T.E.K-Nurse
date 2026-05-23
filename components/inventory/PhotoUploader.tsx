"use client";

import { useCallback, useId, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Upload, X, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "sku-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Photo uploader for SKU forms. Controlled — parent owns the public URL.
 * Emits a hidden <input name={name}> so it composes inside server-action
 * <form action={...}>. No state is passed through the form besides the URL.
 */
export function PhotoUploader({
  value,
  onChange,
  name = "photo_url",
  label = "Photo",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  name?: string;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setError("Use JPG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(
          `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`,
        );
        return;
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const ext =
          file.name.includes(".") ? file.name.split(".").pop() ?? "jpg" : "jpg";
        const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${crypto.randomUUID()}.${safeExt || "jpg"}`;

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type,
            cacheControl: "31536000",
            upsert: false,
          });
        if (uploadErr) throw uploadErr;

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        onChange(data.publicUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        setError(msg);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const onRemove = () => {
    setError(null);
    onChange(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
        {label}
      </span>

      {value ? (
        <div className="flex items-start gap-4">
          <div className="w-32 h-32 rounded border-[1.5px] border-rule overflow-hidden bg-mist shrink-0">
            <Image
              src={value}
              alt="SKU photo preview"
              width={256}
              height={256}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[14px] text-slate">Photo uploaded.</p>
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={inputId}
                className="inline-flex items-center gap-2 cursor-pointer bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[13px] tracking-[0.1em] font-bold px-4 py-2 rounded hover:border-teal hover:text-teal-deep"
              >
                <Upload size={14} strokeWidth={2} />
                Replace
              </label>
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-2 bg-transparent text-red-deep border-[1.5px] border-red-deep font-mono uppercase text-[13px] tracking-[0.1em] font-bold px-4 py-2 rounded hover:bg-red-deep hover:text-white"
              >
                <X size={14} strokeWidth={2} />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 cursor-pointer rounded border-[1.5px] border-dashed py-8 px-4 transition-colors ${
            dragging
              ? "border-teal bg-teal/5 text-teal-deep"
              : "border-rule bg-mist text-slate/70 hover:border-teal hover:text-teal-deep"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={28} strokeWidth={1.75} className="animate-spin" />
              <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em]">
                Uploading…
              </span>
            </>
          ) : (
            <>
              <Camera size={28} strokeWidth={1.5} />
              <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em]">
                Drop or click to upload
              </span>
              <span className="text-[13px] text-slate/70">
                JPG, PNG, WebP, or GIF · up to 5 MB
              </span>
            </>
          )}
        </label>
      )}

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={onPick}
        className="sr-only"
        disabled={uploading}
      />

      <input type="hidden" name={name} value={value ?? ""} />

      {error && (
        <p className="inline-flex items-center gap-1.5 text-[13px] text-red-deep font-medium">
          <AlertTriangle size={14} strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}
