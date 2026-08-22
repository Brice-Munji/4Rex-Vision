"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteAccount } from "@/actions/profile";

export function ProfileDanger() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirm, setConfirm] = React.useState("");

  function onDelete() {
    startTransition(async () => {
      const res = await deleteAccount();
      if (res.ok) {
        toast.success("Your account has been deleted.");
        router.push("/");
        router.refresh();
      } else {
        toast.error(res.message ?? "Could not delete account.");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-red-500/30 bg-red-500/[0.04] p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Danger zone
          </h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-background/40 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium">Delete account</p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <Dialog onOpenChange={() => setConfirm("")}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently removes your profile, preferences and history.
                Type <span className="font-semibold text-foreground">DELETE</span>{" "}
                to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="confirm">Confirmation</Label>
              <Input
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                onClick={onDelete}
                disabled={pending || confirm !== "DELETE"}
                className="bg-red-500 text-white shadow-red-500/25 hover:bg-red-600 hover:shadow-red-500/40"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Permanently delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
