"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProfile } from "@/server/actions/account";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ProfileForm({
  firstName,
  lastName,
}: {
  firstName: string | null;
  lastName: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await updateProfile({ firstName: first, lastName: last });
        toast.success("Profil enregistré");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Le profil n'a pas pu être enregistré. Réessayez.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner className="mr-2" />}
          {pending ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}
