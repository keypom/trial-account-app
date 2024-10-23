import { createFileRoute } from "@tanstack/react-router";
import TrialAccountForm from "@/components/TrialAccountForm";

export const Route = createFileRoute("/")({
  component: HomePage
});

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl py-12">
        <TrialAccountForm />
      </div>
    </div>
  );
}
