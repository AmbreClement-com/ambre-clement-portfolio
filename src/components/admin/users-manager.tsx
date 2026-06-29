"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, Trash2, UserPlus } from "lucide-react";
import {
  inviteUser,
  regenerateInvite,
  setUserRole,
  deleteUser,
} from "@/server/actions/users";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  inviteToken: string | null;
};

function inviteUrl(token: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/admin/set-password?token=${token}`;
}

export function UsersManager({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [linkDialog, setLinkDialog] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function refresh() {
    router.refresh();
  }

  function showLink(token: string) {
    setCopied(false);
    setLinkDialog(inviteUrl(token));
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const res = await inviteUser({ email, firstName, lastName, role });
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("editor");
        toast.success("Invitation créée");
        showLink(res.inviteToken);
        refresh();
      } catch {
        toast.error("L'invitation n'a pas pu être créée. Réessayez.");
      }
    });
  }

  function changeRole(id: string, next: "admin" | "editor") {
    start(async () => {
      try {
        const res = await setUserRole(id, next);
        if ("error" in res) {
          toast.error(res.error);
          refresh(); // resynchronise l'affichage du rôle
          return;
        }
        toast.success("Rôle mis à jour");
        refresh();
      } catch {
        toast.error("Le rôle n'a pas pu être modifié. Réessayez.");
        refresh();
      }
    });
  }

  function regenerate(id: string) {
    start(async () => {
      try {
        const res = await regenerateInvite(id);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success("Nouveau lien généré");
        showLink(res.inviteToken);
        refresh();
      } catch {
        toast.error("Le lien d'invitation n'a pas pu être régénéré. Réessayez.");
      }
    });
  }

  function remove(id: string, label: string) {
    if (
      !confirm(
        `Supprimer définitivement le compte « ${label} » ? Cette personne perdra immédiatement son accès.`,
      )
    )
      return;
    start(async () => {
      try {
        const res = await deleteUser(id);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        toast.success("Utilisateur supprimé");
        refresh();
      } catch {
        toast.error("L'utilisateur n'a pas pu être supprimé. Réessayez.");
      }
    });
  }

  async function copyLink() {
    if (!linkDialog) return;
    try {
      await navigator.clipboard.writeText(linkDialog);
      setCopied(true);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible. Sélectionnez le lien et copiez-le manuellement.");
    }
  }

  return (
    <div className="grid gap-6">
      {/* Inviter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            Inviter un utilisateur
          </CardTitle>
          <CardDescription>
            L&apos;invité reçoit un lien et choisit lui-même son mot de passe à
            la première connexion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitInvite} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="inv-first">Prénom</Label>
                <Input
                  id="inv-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-last">Nom</Label>
                <Input
                  id="inv-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <Label htmlFor="inv-email">Email</Label>
                <Input
                  id="inv-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-role">Rôle</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as "admin" | "editor")}
                >
                  <SelectTrigger id="inv-role" className="sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Éditeur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner className="mr-2" />}
                Créer l&apos;invitation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({users.length})</CardTitle>
          <CardDescription>
            Éditeur : contenu uniquement. Administrateur : accès total
            (utilisateurs, réglages).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name ?? "—"}</div>
                      <div className="text-sm text-muted-foreground">
                        {u.email}
                        {isSelf && " (vous)"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.active ? (
                        <Badge variant="secondary">Actif</Badge>
                      ) : (
                        <Badge variant="outline">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) =>
                          changeRole(u.id, v as "admin" | "editor")
                        }
                        disabled={pending}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Éditeur</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!u.active && u.inviteToken && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showLink(u.inviteToken!)}
                          >
                            <Copy className="size-4" />
                            Lien
                          </Button>
                        )}
                        {!u.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Régénérer le lien"
                            onClick={() => regenerate(u.id)}
                            disabled={pending}
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                        )}
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer"
                            onClick={() => remove(u.id, u.email)}
                            disabled={pending}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog du lien d'invitation */}
      <Dialog
        open={linkDialog !== null}
        onOpenChange={(o) => !o && setLinkDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lien d&apos;invitation</DialogTitle>
            <DialogDescription>
              Transmettez ce lien à l&apos;utilisateur. Il y choisira son mot de
              passe. Le lien est à usage unique.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={linkDialog ?? ""} className="font-mono text-xs" />
            <Button type="button" variant="secondary" onClick={copyLink}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
