import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export default function SignIn() {
  return (
    <>
      <p>
        This app allows you to create and manage trial accounts on NEAR and EVM
        chains. To get started, sign in with your NEAR account.
      </p>
      <br />
      <Button asChild>
        <Link to="/login">Sign In</Link>
      </Button>
    </>
  );
}
