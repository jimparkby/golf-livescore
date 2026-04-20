import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trophy, LogOut, Shield } from "lucide-react";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-elegant">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg uppercase tracking-wider">Minsk Golf</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live Scoring</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <Shield className="mr-1 h-4 w-4" /> Админ
            </Button>
          )}
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>Войти</Button>
          )}
        </nav>
      </div>
    </header>
  );
}