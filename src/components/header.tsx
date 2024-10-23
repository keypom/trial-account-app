import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useWallet } from "@/contexts/near";
import { Link } from "@tanstack/react-router";

export default function Header() {
  const { signedAccountId } = useWallet();

  return (
    <header className="border shadow-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-bold sm:text-2xl">
          🛠️ Trial Account Manager
        </Link>
        <nav className="flex items-center gap-4">
          <ModeToggle />
          {signedAccountId ? (
            <Button asChild>
              <Link to={`/profile/${signedAccountId}`}>{signedAccountId}</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Connect NEAR Account</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
