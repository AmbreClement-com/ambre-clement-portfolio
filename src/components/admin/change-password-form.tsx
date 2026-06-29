"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changePassword } from "@/server/actions/account";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ChangePasswordForm() {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("Le nouveau mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (next !== confirm) {
      toast.error("Le nouveau mot de passe et sa confirmation sont différents.");
      return;
    }
    start(async () => {
      try {
        const res = await changePassword({
          currentPassword: current,
          newPassword: next,
        });
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success("Mot de passe modifié");
        setCurrent("");
        setNext("");
        setConfirm("");
      } catch {
        toast.error("Le mot de passe n'a pas pu être modifié. Réessayez.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="current">Mot de passe actuel</Label>
        <Input
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="next">Nouveau mot de passe</Label>
        <Input
          id="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner className="mr-2" />}
          {pending ? "Modification…" : "Changer le mot de passe"}
        </Button>
      </div>
    </form>
  );
}
