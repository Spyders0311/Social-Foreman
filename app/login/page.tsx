import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign In | Social Foreman",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <LoginForm />
    </div>
  );
}
