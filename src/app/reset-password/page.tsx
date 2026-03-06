import ResetPasswordClient from "./reset-password-client";
import { sanitizeString } from "../utils/input";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const token =
    sanitizeString(
      typeof searchParams?.token === "string" ? searchParams.token : "",
      { maxLength: 128 },
    );

  return <ResetPasswordClient token={token} />;
}

