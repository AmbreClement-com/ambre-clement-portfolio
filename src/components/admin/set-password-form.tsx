"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setPasswordFromInvite } from "@/server/actions/users";
import { passwordIssue, PASSWORD_MIN } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Validation en direct : la raison du refus est visible AVANT de soumettre.
  const pwdIssue = pwd ? passwordIssue(pwd) : null;
  const mismatch = confirm.length > 0 && pwd !== confirm;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const issue = passwordIssue(pwd);
    if (issue) {
      setError(issue);
      return;
    }
    if (pwd !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    start(async () => {
      try {
        const res = await setPasswordFromInvite({ token, password: pwd });
        if ("error" in res) {
          setError(res.error);
          return;
        }
        toast.success("Mot de passe défini, vous pouvez vous connecter.");
        router.push("/admin/login");
      } catch {
        setError(
          "Le mot de passe n'a pas pu être défini. Réessayez, ou demandez un nouveau lien d'invitation.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pwd">Nouveau mot de passe</Label>
        <Input
          id="pwd"
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          required
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
        />
        {pwdIssue ? (
          <p className="text-xs text-destructive">{pwdIssue}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {pwd ? "✓ Mot de passe valide." : `${PASSWORD_MIN} caractères minimum.`}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
        />
        {mismatch && (
          <p className="text-xs text-destructive">
            Les deux mots de passe ne correspondent pas.
          </p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Spinner className="mr-2" />}
        {pending ? "Validation…" : "Définir le mot de passe"}
      </Button>
    </form>
  );
}
