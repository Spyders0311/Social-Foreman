import Nav from "../components/Nav";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign In | Social Foreman",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <Nav />
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-2xl font-bold tracking-tight text-[#132027]">
              Social Foreman
            </p>
            <p className="mt-2 text-[#405058]">
              Welcome back — let&apos;s keep your page active.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
