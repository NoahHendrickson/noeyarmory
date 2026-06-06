"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import {
  Button,
  cn,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Input,
  SegmentedToggle,
} from "@repo/ui";

type FeedbackType = "bug" | "feature";
type SubmitState = "idle" | "submitting" | "success" | "error";

const TYPE_OPTIONS = [
  { value: "bug" as const, label: "Bug" },
  { value: "feature" as const, label: "Feature" },
];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);

  function resetForm() {
    setType("bug");
    setTitle("");
    setBody("");
    setWebsite("");
    setSubmitState("idle");
    setErrorMessage(null);
    setIssueUrl(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "submitting") return;

    setSubmitState("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          body,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          website,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        issueUrl?: string | null;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setSubmitState("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitState("success");
      setIssueUrl(data.issueUrl ?? null);
    } catch {
      setSubmitState("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Send feedback"
            className="text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur-sm"
          />
        }
      >
        <MessageSquare className="size-4" />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md">
          {submitState === "success" ? (
            <div className="space-y-4">
              <DialogTitle>Thanks for the feedback</DialogTitle>
              <DialogDescription>
                Your {type === "bug" ? "bug report" : "feature request"} was submitted.
                {issueUrl && (
                  <>
                    {" "}
                    <a
                      href={issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      View on GitHub
                    </a>
                  </>
                )}
              </DialogDescription>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <DialogTitle>Send feedback</DialogTitle>
                <DialogDescription>
                  Report a bug or suggest a feature. Submissions create a GitHub issue for triage.
                </DialogDescription>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Type</span>
                <SegmentedToggle
                  aria-label="Feedback type"
                  options={TYPE_OPTIONS}
                  value={type}
                  onValueChange={setType}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="feedback-title" className="text-sm font-medium">
                  Summary
                </label>
                <Input
                  id="feedback-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === "bug" ? "Brief description of the bug" : "Feature idea"}
                  maxLength={100}
                  required
                  disabled={submitState === "submitting"}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="feedback-body" className="text-sm font-medium">
                  Details
                </label>
                <textarea
                  id="feedback-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "What happened? What did you expect? Steps to reproduce?"
                      : "What would you like to see and why?"
                  }
                  maxLength={4000}
                  required
                  disabled={submitState === "submitting"}
                  rows={5}
                  className={cn(
                    "border-input placeholder:text-muted-foreground flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
              </div>

              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              {errorMessage && (
                <p className="text-destructive text-sm" role="alert">
                  {errorMessage}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitState === "submitting"}
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={submitState === "submitting"}>
                  {submitState === "submitting" ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
