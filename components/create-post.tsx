"use client";

import { FiX, FiUpload, FiVideo } from "react-icons/fi";
import { useState, useEffect, useCallback } from "react";

type CreatePostProps = {
  open: boolean;
  onClose: () => void;
  onShare: () => void;
};

export default function CreatePost({ open, onClose, onShare }: CreatePostProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [stage, setStage] = useState<"pick" | "upload" | "done">("pick");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const resetState = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setStage("pick");
    setError("");
    setProgress(0);
    setCaption("");
    setLocation("");
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
    setStage("pick");
  };

  const share = useCallback(async () => {
    if (!file) return;
    setStage("upload");
    setProgress(10);

    try {
      let mediaKey: string | undefined;
      let publicUrl: string | undefined;
      const isVideo = file.type.startsWith("video");

      // Attempt 1: Presigned PUT URL for direct S3 upload
      let presignSuccessful = false;
      try {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
          }),
        });

        if (presignRes.ok) {
          const presignData = await presignRes.json();
          const { uploadUrl, key, publicUrl: pub } = presignData;

          // Perform direct PUT to S3 with progress tracking
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadUrl, true);
            xhr.setRequestHeader("Content-Type", file.type);

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
            xhr.send(file);
          });

          mediaKey = key;
          publicUrl = pub;
          presignSuccessful = true;
        }
      } catch (presignErr) {
        console.warn("Presigned direct upload failed, attempting server proxy fallback...", presignErr);
      }

      // Attempt 2: Fallback to server proxy upload if presigned failed
      if (!presignSuccessful) {
        setProgress(40);
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(uploadData.error || "Storage upload failed");
        }

        mediaKey = uploadData.key;
        publicUrl = uploadData.publicUrl;
      }

      setProgress(90);

      // Create post in MongoDB
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaKey,
          imageUrl: !isVideo ? publicUrl : undefined,
          videoUrl: isVideo ? publicUrl : undefined,
          mediaType: isVideo ? "video" : "image",
          caption: caption.trim() || "",
          location: location.trim() || undefined,
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
  }, [file, caption, location, onShare, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="create-modal w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                        className="w-full h-full object-contain"
                      />
                    )}
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview("");
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      aria-label="Remove media"
                    >
                      <FiX size={16} />
                    </button>
                  </div>

                  <div className="media-info flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span className="truncate max-w-[240px]">{file.name}</span>
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Caption
                      </label>
                      <textarea
                        rows={3}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption…"
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Location (optional)
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Add location"
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
                      className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                      onClick={share}
                    >
                      Share
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
                  <span className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
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
                <span className="text-sm font-medium">Uploading to media storage…</span>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
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
              <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-2">
                <FiVideo size={30} />
              </div>
              <h3 className="font-bold text-lg">Post Shared!</h3>
              <p className="text-sm text-muted-foreground">Your moment has been shared with your followers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
