import type { AuthActionState } from "@/app/(auth)/actions";

export function FormMessage({ state }: { state: AuthActionState }) {
  if (!state.message) {
    return null;
  }

  const isSuccess = state.status === "success";

  return (
    <div
      className={`rounded-sm px-4 py-3 text-sm leading-6 ${
        isSuccess
          ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
          : "bg-red-50 text-red-900 ring-1 ring-red-200"
      }`}
      role={isSuccess ? "status" : "alert"}
    >
      {state.message}
    </div>
  );
}
