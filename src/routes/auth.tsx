import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | تِجَارِي" },
      { name: "description", content: "سجّل الدخول إلى تِجَارِي لحفظ عقودك وفواتيرك ومتابعة اشتراكك." },
      { property: "og:title", content: "تسجيل الدخول | تِجَارِي" },
      { property: "og:description", content: "حساب تِجَارِي للتاجر الجزائري: عقود، فواتير، وحاسبة أرباح." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/" });
  }, [loading, user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    void navigate({ to: "/" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      void navigate({ to: "/" });
    } else {
      toast.success(t("auth.checkEmail"));
    }
  }

  async function googleSignIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      return toast.error(t("common.error"));
    }
    if (result.redirected) return;
    setBusy(false);
    void navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 flex size-16 items-center justify-center rounded-3xl bg-gradient-gold shadow-gold">
          <Sparkles className="size-8 text-primary-foreground" />
        </span>
        <h1 className="text-3xl font-extrabold tracking-wide text-gradient-gold">{t("app.name")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.intro")}</p>
      </div>

      <div className="glass-card p-5">
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
            <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form className="space-y-3" onSubmit={signIn}>
              <div className="space-y-1.5">
                <Label htmlFor="login-email">{t("auth.email")}</Label>
                <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">{t("auth.password")}</Label>
                <Input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {t("auth.login")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form className="space-y-3" onSubmit={signUp}>
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">{t("auth.name")}</Label>
                <Input id="reg-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-phone">{t("auth.phone")}</Label>
                <Input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0675..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">{t("auth.email")}</Label>
                <Input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">{t("auth.password")}</Label>
                <Input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {t("auth.register")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>—</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={googleSignIn}>
          {t("auth.google")}
        </Button>
      </div>
    </div>
  );
}
