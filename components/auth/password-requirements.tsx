import { passwordRequirements } from "@/lib/auth/validation";

export function PasswordRequirements() {
  return (
    <div className="rounded-sm bg-[#FBFAF7] p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
      <p className="font-medium text-[#0F172A]">Password requirements</p>
      <ul className="mt-2 space-y-1">
        {passwordRequirements.map((requirement) => (
          <li key={requirement} className="flex gap-2">
            <span className="mt-2 h-px w-4 shrink-0 bg-[#D4A017]" />
            <span>{requirement}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
