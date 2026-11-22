"use client";

import { ImageSquare, UploadSimple, X } from "@phosphor-icons/react";
import { createClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";

import type { Media } from "../schema";
import { createUploadUrl } from "./actions";
import a from "./admin.module.css";

let browserClient: ReturnType<typeof createClient> | null = null;
const storage = () => {
  browserClient ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  return browserClient.storage.from("goonj-media");
};

async function upload(file: File) {
  const slot = await createUploadUrl(file.type, file.size);
  if (!slot.ok) throw new Error(slot.message);
  const { error } = await storage().uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return slot.publicUrl;
}

function Picker({
  accept,
  label,
  onFile,
  busy,
}: {
  accept: string;
  label: string;
  onFile: (f: File) => void;
  busy: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button type="button" className={`${a.btn} ${a.small}`} disabled={busy} onClick={() => input.current?.click()}>
        <UploadSimple />
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}

/** Image or video for the hero / points, uploaded to Supabase Storage. */
export function MediaField({
  value,
  onChange,
  error,
  allowVideo = true,
  onRemove,
}: {
  value: Media | undefined;
  onChange: (m: Media) => void;
  error?: string;
  allowVideo?: boolean;
  onRemove?: () => void;
}) {
  const [busy, setBusy] = useState<"" | "main" | "poster">("");
  const [problem, setProblem] = useState("");

  const run = async (which: "main" | "poster", file: File) => {
    setProblem("");
    setBusy(which);
    try {
      const url = await upload(file);
      if (which === "poster" && value) onChange({ ...value, poster: url });
      else onChange({ type: file.type.startsWith("video/") ? "video" : "image", url, alt: value?.alt ?? "", poster: undefined });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={a.field}>
      <div className={a.media}>
        <div className={a.thumb}>
          {value?.url ? (
            value.type === "video" ? (
              <video src={value.url} poster={value.poster} muted playsInline loop autoPlay />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- dashboard thumbnail of an arbitrary upload
              <img src={value.url} alt="" />
            )
          ) : (
            <span style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)" }}>
              <ImageSquare size={28} />
            </span>
          )}
        </div>
        <div className={a.stack} style={{ gap: 10 }}>
          <div className={a.editorActions}>
            <Picker
              accept={allowVideo ? "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
              label={value?.url ? "Replace" : allowVideo ? "Upload image or video" : "Upload image"}
              busy={busy === "main"}
              onFile={(f) => run("main", f)}
            />
            {value?.type === "video" ? (
              <Picker
                accept="image/jpeg,image/png,image/webp"
                label={value.poster ? "Replace cover" : "Add cover image"}
                busy={busy === "poster"}
                onFile={(f) => run("poster", f)}
              />
            ) : null}
            {onRemove && value ? (
              <button type="button" className={`${a.btn} ${a.small} ${a.icon}`} onClick={onRemove} aria-label="Remove image">
                <X />
              </button>
            ) : null}
          </div>
          {value ? (
            <input
              className={a.input}
              placeholder="Describe the image for screen readers"
              value={value.alt}
              maxLength={200}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              aria-label="Image description"
            />
          ) : null}
          <span className={a.hint}>
            {allowVideo ? "Images up to 10 MB. Videos up to 50 MB play muted on a loop." : "Images up to 10 MB."} A tall
            4:5 shot fits best.
          </span>
        </div>
      </div>
      {problem || error ? <span className={a.err}>{problem || error}</span> : null}
    </div>
  );
}
