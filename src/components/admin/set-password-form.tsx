"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setPasswordFromInvite } from "@/server/actions/users";
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwd.length < 8) {
      setError("8 caractères minimum.");
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
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
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
          minLength={8}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Spinner className="mr-2" />}
        {pending ? "Validation…" : "Définir le mot de passe"}
      </Button>
    </form>
  );
}
