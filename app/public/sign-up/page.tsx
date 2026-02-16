import { AuthLayout } from "@/components/auth-layout";
import SignUpForm from "./signUpForm";

export default function Page() {
  return (
    <AuthLayout>
      <SignUpForm />
    </AuthLayout>
  );
}
