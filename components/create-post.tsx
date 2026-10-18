"use client";

import { FiX, FiUpload, FiCheck, FiMapPin } from "react-icons/fi";
import { useState, useEffect, useCallback } from "react";

type CreatePostProps = {
  open: boolean;
  onClose: () => void;
  onShare: () => void;
};

const FILTERS = [
  { id: "normal", name: "Normal", filter: "none" },
  { id: "clarendon", name: "Clarendon", filter: "contrast(1.2) saturate(1.25)" },
  { id: "gingham", name: "Gingham", filter: "brightness(1.05) hue-rotate(-10deg)" },
  { id: "valencia", name: "Valencia", filter: "contrast(1.08) sepia(0.2) saturate(1.1)" },
  { id: "lark", name: "Lark", filter: "contrast(0.9) brightness(1.1) saturate(1.2)" },
  { id: "mono", name: "Moon", filter: "grayscale(1) contrast(1.15) brightness(1.05)" },
  { id: "vintage", name: "Vintage", filter: "sepia(0.55) contrast(1.1) brightness(0.95)" },
  { id: "vibrant", name: "Vibrant", filter: "saturate(1.6) contrast(1.1)" },
];

const SUGGESTED_LOCATIONS = [
  "New York, NY",
  "Los Angeles, CA",
  "London, UK",
  "Tokyo, Japan",
  "Paris, France",
  "Mumbai, India",
];

async function applyFilterToImageFile(file: File, filterStyle: string): Promise<File> {
  if (filterStyle === "none") return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.filter = filterStyle;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const filteredFile = new File([blob], file.name, { type: file.type });
        resolve(filteredFile);
      }, file.type);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function CreatePost({ open, onClose, onShare }: CreatePostProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState("normal");
  const [stage, setStage] = useState<"pick" | "upload" | "done">("pick");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [taggedUsernames, setTaggedUsernames] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const resetState = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setSelectedFilter("normal");
    setStage("pick");
    setError("");
    setProgress(0);
    setCaption("");
    setLocation("");
    setTaggedUsernames("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const selectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^(image|video)\//.test(f.type)) {
      setError("Please select an image or video file.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSelectedFilter("normal");
    setStage("pick");
  };

  const activeFilterStyle =
    FILTERS.find((f) => f.id === selectedFilter)?.filter || "none";

  const share = useCallback(async () => {
    if (!file) return;
    setStage("upload");
    setProgress(10);

    try {
      let uploadTargetFile = file;
      const isVideo = file.type.startsWith("video");

      // Bake filter onto image if one was applied
      if (!isVideo && selectedFilter !== "normal") {
        setProgress(15);
        uploadTargetFile = await applyFilterToImageFile(file, activeFilterStyle);
      }

      let mediaKey: string | undefined;

      // Attempt 1: Presigned PUT URL for direct S3 upload
      let presignSuccessful = false;
      try {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: uploadTargetFile.name,
            contentType: uploadTargetFile.type,
          }),
        });

        if (presignRes.ok) {
          const presignData = await presignRes.json();
          const { uploadUrl, key } = presignData;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadUrl, true);
            xhr.setRequestHeader("Content-Type", uploadTargetFile.type);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 70) + 15;
                setProgress(percent);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`S3 direct upload failed with status ${xhr.status}`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error during direct S3 upload"));
            xhr.send(uploadTargetFile);
          });

          mediaKey = key;
          presignSuccessful = true;
        }
      } catch (presignErr) {
        console.warn("Presigned direct upload failed, attempting server proxy fallback...", presignErr);
      }

      // Attempt 2: Fallback to server proxy upload if presigned failed or not configured
      if (!presignSuccessful) {
        setProgress(40);
        const formData = new FormData();
        formData.append("file", uploadTargetFile);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(uploadData.error || "Storage upload failed");
        }

        mediaKey = uploadData.key;
      }

      setProgress(90);

      const taggedUserIds = (
        await Promise.all(
          taggedUsernames
            .split(",")
            .map((value) => value.trim().replace(/^@/, "").toLowerCase())
            .filter(Boolean)
            .slice(0, 20)
            .map(async (username) => {
              const response = await fetch(`/api/users/by-username/${encodeURIComponent(username)}`);
              if (!response.ok) return null;
              const user = await response.json();
              return user._id || null;
            })
        )
      ).filter((id): id is string => Boolean(id));

      // Create post in MongoDB
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaKey,
          mediaType: isVideo ? "video" : "image",
          caption: caption.trim() || "",
          location: location.trim() || undefined,
          taggedUserIds,
        }),
      });

      const postData = await postRes.json().catch(() => ({}));
      if (!postRes.ok) throw new Error(postData.error || "Could not create post");

      setProgress(100);
      setStage("done");

      setTimeout(() => {
        onShare();
        handleClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStage("pick");
    }
  }, [file, selectedFilter, activeFilterStyle, caption, location, taggedUsernames, onShare, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="create-modal w-full max-w-xl rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="modal-head flex items-center justify-between px-6 py-4 border-b border-border">
          <b className="text-base font-semibold">Create new post</b>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <FiX size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {stage === "pick" ? (
            <>
              {file && preview ? (
                <>
                  <div className="media-preview-container w-full h-72 rounded-xl overflow-hidden bg-black flex items-center justify-center mb-4 relative">
                    {file.type.startsWith("video") ? (
                      <video
                        src={preview}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="Preview"
                        style={{ filter: activeFilterStyle }}
                        className="w-full h-full object-contain transition-all duration-200"
                      />
                    )}
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview("");
                        setSelectedFilter("normal");
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      aria-label="Remove media"
                    >
                      <FiX size={16} />
                    </button>
                  </div>

                  {/* Photo Filters Strip (Only for images) */}
                  {!file.type.startsWith("video") && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-muted-foreground mb-2">
                        Choose Filter
                      </label>
                      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                        {FILTERS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSelectedFilter(f.id)}
                            className={`flex flex-col items-center gap-1 shrink-0 p-1 rounded-xl transition-all ${
                              selectedFilter === f.id
                                ? "ring-2 ring-primary bg-accent/60 font-semibold"
                                : "hover:bg-accent/40"
                            }`}
                          >
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted border border-border">
                              <img
                                src={preview}
                                alt={f.name}
                                style={{ filter: f.filter }}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-[11px] text-foreground">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Caption
                      </label>
                      <textarea
                        rows={2}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption…"
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Location
                        </label>
                      </div>
                      <div className="relative">
                        <FiMapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Add location"
                          className="w-full border border-border rounded-xl pl-9 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      {/* Quick Location Chips */}
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {SUGGESTED_LOCATIONS.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setLocation(loc)}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-accent/60 hover:bg-accent border border-border transition-colors text-muted-foreground hover:text-foreground"
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Tag people
                      </label>
                      <input
                        type="text"
                        value={taggedUsernames}
                        onChange={(e) => setTaggedUsernames(e.target.value)}
                        placeholder="username, another_username"
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="modal-foot mt-5 flex items-center justify-end gap-3 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
                      onClick={share}
                    >
                      Share Post
                    </button>
                  </div>
                </>
              ) : (
                <label className="upload-drop flex flex-col items-center justify-center py-16 px-6 rounded-2xl border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer group">
                  <div className="p-4 rounded-full bg-accent/60 group-hover:bg-primary/10 transition-colors mb-4">
                    <FiUpload size={36} strokeWidth={2} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">Drag photos and videos here</h3>
                  <span className="text-sm text-muted-foreground mb-4">
                    Supports JPG, PNG, WEBP, GIF, and MP4 videos
                  </span>
                  <span className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md group-hover:opacity-95 transition-opacity">
                    Select from computer
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={selectFile}
                    className="sr-only"
                  />
                </label>
              )}
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </>
          ) : stage === "upload" ? (
            <div className="uploading flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="w-full max-w-xs space-y-2 text-center">
                <span className="text-sm font-medium">Processing & sharing your post…</span>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
            </div>
          ) : (
            <div className="done-state flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                <FiCheck size={36} strokeWidth={3} />
              </div>
              <h3 className="font-bold text-lg">Post Shared!</h3>
              <p className="text-sm text-muted-foreground">Your moment is now live on Instagram.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
