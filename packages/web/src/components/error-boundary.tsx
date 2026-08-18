import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes anywhere below it so a single bad component
 * shows a recoverable message instead of a blank white page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.assign("/");
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              The page hit an unexpected error. Your data is safe — reloading usually
              clears it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {import.meta.env.DEV && (
              <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                {error.message}
              </pre>
            )}
            <Button onClick={this.handleReload} className="w-full">
              Reload the app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
