"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "./button";
import { Input } from "./input";
import {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";
import { cn } from "../lib/utils";

type FeedbackType = "bug" | "feature";
type SubmitState = "idle" | "submitting" | "success" | "error";

const TYPE_OPTIONS = [
  { value: "feature" as const, label: "Feature" },
  { value: "bug" as const, label: "Bug" },
];

const sectionClass = "border-b border-white/16 p-4";
const headerTitleClass = "text-base font-normal";
const headerDescriptionClass = "text-xs leading-snug text-white/60";
const fieldLabelClass = "text-xs font-medium text-foreground";
const fieldInputClass =
  "border-input placeholder:text-muted-foreground h-8 rounded-[8px] border bg-transparent px-2.5 text-xs shadow-sm";
const fieldTextareaClass = cn(
  fieldInputClass,
  "flex min-h-[72px] w-full resize-y py-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
);
const actionButtonClass = "h-7 rounded-[8px] px-2 text-xs";
const secondaryButtonClass = cn(
  actionButtonClass,
  "border border-white/16 bg-white/[0.04] font-medium text-white hover:bg-white/10 hover:text-white",
);

const popupClassName =
  "max-h-[min(85vh,var(--available-height))] w-[min(360px,var(--available-width))] overflow-hidden rounded-[16px] p-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]";

export interface FeedbackDialogProps {
  defaultOpen?: boolean;
  defaultType?: FeedbackType;
  defaultSubmitState?: SubmitState;
  defaultIssueUrl?: string | null;
  hideTrigger?: boolean;
}

export function FeedbackDialog({
  defaultOpen = false,
  defaultType = "bug",
  defaultSubmitState = "idle",
  defaultIssueUrl = null,
  hideTrigger = false,
}: FeedbackDialogProps = {}) {
  const [type, setType] = useState<FeedbackType>(defaultType);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>(defaultSubmitState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issueUrl, setIssueUrl] = useState<string | null>(defaultIssueUrl);
  const [manualSubmit, setManualSubmit] = useState(false);

  function resetForm() {
    setType(defaultType);
    setTitle("");
    setBody("");
    setWebsite("");
    setSubmitState(defaultSubmitState);
    setErrorMessage(null);
    setIssueUrl(defaultIssueUrl);
    setManualSubmit(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    // Reset only when opening — avoids a post-close state flush that re-renders
    // the backdrop-blur trigger over the shader right as the popover unmounts.
    if (nextOpen) {
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
          pageUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
          userAgent: navigator.userAgent,
          website,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        issueUrl?: string | null;
        manual?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setSubmitState("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const nextIssueUrl = data.issueUrl ?? null;
      const isManual = data.manual === true && nextIssueUrl !== null;
      if (data.manual === true && nextIssueUrl) {
        window.open(nextIssueUrl, "_blank", "noopener,noreferrer");
      }

      setSubmitState("success");
      setIssueUrl(nextIssueUrl);
      setManualSubmit(isManual);
    } catch {
      setSubmitState("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  }

  const triggerButton = (
    <Button
      variant="outline"
      aria-label="Send feedback"
      data-palette-ignore-close
      className={cn(secondaryButtonClass, "px-3 backdrop-blur-sm")}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );

  return (
    <Popover defaultOpen={defaultOpen} onOpenChange={handleOpenChange} modal={false}>
      {hideTrigger ? (
        <PopoverTrigger
          render={
            <button type="button" className="sr-only" tabIndex={-1} aria-hidden="true" />
          }
        />
      ) : (
        <PopoverTrigger render={triggerButton}>Feedback</PopoverTrigger>
      )}
      <PopoverPortal>
        <PopoverPositioner side="bottom" align="end" sideOffset={8}>
          <PopoverPopup className={popupClassName}>
            {submitState === "success" ? (
              <>
                <div className={cn(sectionClass, "space-y-0.5")}>
                  <div className="flex items-center justify-between gap-3">
                    <PopoverTitle className={headerTitleClass}>
                      Thanks for the feedback
                    </PopoverTitle>
                    <PopoverClose
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="iconRound"
                          className="border border-white/16 bg-white/[0.04] text-foreground hover:bg-white/10"
                          aria-label="Close"
                        />
                      }
                    >
                      <X className="size-4" />
                    </PopoverClose>
                  </div>
                  <PopoverDescription className={headerDescriptionClass}>
                    {manualSubmit ? (
                      <>
                        We opened GitHub in a new tab with your{" "}
                        {type === "bug" ? "bug report" : "feature request"} pre-filled. Sign in
                        there and click <strong>Create</strong> to finish submitting.
                        {issueUrl && (
                          <>
                            {" "}
                            <a
                              href={issueUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Open GitHub again
                            </a>
                          </>
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </PopoverDescription>
                </div>
                <div className="flex justify-end p-4">
                  <PopoverClose
                    render={<Button type="button" className={secondaryButtonClass} />}
                  >
                    Close
                  </PopoverClose>
                </div>
              </>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)}>
                <div className={cn(sectionClass, "space-y-0.5")}>
                  <div className="flex items-center justify-between gap-3">
                    <PopoverTitle className={headerTitleClass}>Send feedback</PopoverTitle>
                    <PopoverClose
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="iconRound"
                          className="border border-white/16 bg-white/[0.04] text-foreground hover:bg-white/10"
                          aria-label="Close"
                          disabled={submitState === "submitting"}
                        />
                      }
                    >
                      <X className="size-4" />
                    </PopoverClose>
                  </div>
                  <PopoverDescription className={headerDescriptionClass}>
                    Report a bug or suggest a feature. Submissions create a GitHub issue and
                    include this page path plus your browser user agent for triage.
                  </PopoverDescription>
                </div>

                <div className="flex flex-col gap-3 px-4 pt-3">
                  <div className="flex gap-2" role="radiogroup" aria-label="Feedback type">
                    {TYPE_OPTIONS.map((option) => {
                      const active = option.value === type;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setType(option.value)}
                          disabled={submitState === "submitting"}
                          className={cn(
                            "inline-flex cursor-pointer items-center justify-center rounded-pill border border-white/16 px-2 py-1 text-xs font-medium transition-colors outline-none",
                            "focus-visible:ring-ring focus-visible:ring-2",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            active
                              ? "bg-white text-card"
                              : "bg-[#2e2c2d] text-foreground",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="feedback-title" className={fieldLabelClass}>
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
                      className={fieldInputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="feedback-body" className={fieldLabelClass}>
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
                      className={fieldTextareaClass}
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
                    <p className="text-destructive text-xs" role="alert">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 p-4">
                  <PopoverClose
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={submitState === "submitting"}
                        className={secondaryButtonClass}
                      />
                    }
                  >
                    Cancel
                  </PopoverClose>
                  <Button
                    type="submit"
                    disabled={submitState === "submitting"}
                    className={actionButtonClass}
                  >
                    {submitState === "submitting" ? "Submitting…" : "Submit"}
                  </Button>
                </div>
              </form>
            )}
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
