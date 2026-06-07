import { FeedbackDialog } from "@repo/ui";

type FeedbackDesignState = "trigger" | "bug" | "feature" | "success";

function parseState(value: string | undefined): FeedbackDesignState {
  if (value === "bug" || value === "feature" || value === "success" || value === "trigger") {
    return value;
  }
  return "bug";
}

export default async function FeedbackDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: rawState } = await searchParams;
  const state = parseState(rawState);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      {state === "trigger" && <FeedbackDialog />}
      {state === "bug" && <FeedbackDialog defaultOpen defaultType="bug" hideTrigger />}
      {state === "feature" && (
        <FeedbackDialog defaultOpen defaultType="feature" hideTrigger />
      )}
      {state === "success" && (
        <FeedbackDialog
          defaultOpen
          defaultType="bug"
          defaultSubmitState="success"
          defaultIssueUrl="https://github.com/example/repo/issues/1"
          hideTrigger
        />
      )}
    </div>
  );
}
