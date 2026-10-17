"use client";

import { FiX, FiUpload, FiImage, FiVideo } from "react-icons/fi";
import { useState, useEffect, useCallback } from "react";

type CreatePostProps = { open: boolean; onClose: () => void; onShare: () => void };

export default function CreatePost({ open, onClose, onShare }: CreatePostProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [stage, setStage] = useState<"pick" | "upload" | "done">("pick");
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");

  // Revoke object URL when file changes or component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const selectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^(image|video)\//.test(f.type)) {
      setError("Please select an image or video file.");
      return;
    }
    // Revoke previous preview URL if any
    if (preview) URL.revokeObjectURL(preview);
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStage("pick");
  };

  const share = useCallback(async () => {
    if (!file) return;
    setStage("upload");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: (() => {
          const formData = new FormData();
          formData.append("file", file);
          return formData;
        })(),
      });
      const uploadData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(uploadData.error || "Upload request failed");
      }
      const { publicUrl, contentType } = uploadData;

      const mediaType = contentType.startsWith("video") ? "video" : "image";
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: mediaType === "image" ? publicUrl : undefined,
          videoUrl: mediaType === "video" ? publicUrl : undefined,
          mediaType,
          caption: caption.trim() || "A new moment.",
          location: location.trim() || undefined,
        }),
      });
      const postData = await postRes.json().catch(() => ({}));
      if (!postRes.ok) throw new Error(postData.error || "Could not create post");

      setStage("done");
      window.setTimeout(() => {
        onShare();
        onClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStage("pick");
    }
  }, [file, caption, location, onShare, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="create-modal fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] z-50 w-full max-w-md mx-auto rounded-2xl bg-background border border-border shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="modal-head flex items-center justify-between px-6 py-4 border-b border-border">
          <b className="text-lg font-semibold">New post</b>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-full">
            <FiX size={20} strokeWidth={2.2} />
          </button>
        </div>
        <div className="px-6 py-4">
          {stage === "pick" ? (
            <>
              {file && preview ? (
                <>
                  <img src={preview} alt="Preview" className="upload-preview w-full h-64 object-cover rounded-xl mb-4" />
                  <div className="media-info flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{file.name}</span>
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Caption</label>
                      <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption…"
                        className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Location (optional)</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Add location"
                        className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="modal-foot mt-4 flex items-center justify-between">
                    <span className="text-sm">{file.name}</span>
                    <button
                      className="primary-button px-6 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                      disabled={false}
                      onClick={share}
                    >
                      Share
                    </button>
                  </div>
                </>
              ) : (
                <label className="upload-drop flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <FiUpload size={32} strokeWidth={2} className="mb-3" />
                  <h3 className="font-semibold">Drag photos and videos here</h3>
                  <span className="text-sm text-muted-foreground">or select from your device</span>
                  <input type="file" accept="image/*,video/*" onChange={selectFile} className="sr-only" />
                </label>
              )}
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </>
          ) : stage === "upload" ? (
            <div className="uploading flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin p-4 rounded-full border-4 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Uploading to storage…</span>
            </div>
          ) : (
            <div className="done-state flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FiVideo size={24} color="#22c55e" />
              </div>
              <p className="text-sm text-muted-foreground">Shared to your feed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
