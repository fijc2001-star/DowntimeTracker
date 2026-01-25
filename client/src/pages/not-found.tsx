import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/50">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-foreground">System Error 404</h1>
            <p className="text-muted-foreground">
              The requested resource could not be located in the system registry.
            </p>
          </div>

          <div className="pt-4">
            <Link href="/">
              <Button className="w-full" size="lg">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
