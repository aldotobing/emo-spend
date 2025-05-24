"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { clearLocalUserData } from "@/lib/db";
import { useToast } from "@/components/ui/use-toast";
import { exportExpensesToCSV, downloadCSV } from "@/lib/csv-export";
import { useAuth } from "@/context/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      // Directly import and use the functions from db.ts, similar to RecentExpenses component
      const { getExpensesByDateRange, clearLocalUserData } = await import('@/lib/db');
      
      // First get all expenses to delete them individually
      const startDate = new Date(0).toISOString(); // Beginning of time
      const endDate = new Date(Date.now() + 1000*60*60*24*365).toISOString(); // One year from now
      const allExpenses = await getExpensesByDateRange(startDate, endDate);
      
      // Delete each expense individually using the same method as RecentExpenses
      const { deleteExpense } = await import('@/lib/db');
      
      // Delete expenses one by one
      for (const expense of allExpenses) {
        await deleteExpense(expense.id);
      }
      
      // Also clear any remaining data with clearLocalUserData
      await clearLocalUserData();
      
      // Keep the clearing state active for a moment to show "Clearing..." text on button
      // then redirect to home with cache busting
      setTimeout(() => {
        window.location.href = '/?clear=' + Date.now();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear data. Please try again.",
        variant: "destructive",
      });
      setIsClearing(false);
    }
    // Don't set isClearing to false on success as we're redirecting
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csvContent = await exportExpensesToCSV();
      downloadCSV(csvContent, "emospend-expenses.csv");
      toast({
        title: "Export successful",
        description: "Your expense data has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how EmoSpend looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === "dark"}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your expense data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Clear All Data</h3>
              <p className="text-sm text-muted-foreground">
                Delete all your expense data. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Clear All Data</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    all your expense data and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  {/* Using a regular Button instead of AlertDialogAction to prevent auto-closing */}
                  <Button 
                    variant="destructive"
                    onClick={handleClearData}
                    disabled={isClearing}
                  >
                    {isClearing ? "Clearing..." : "Yes, clear all data"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Export Data</h3>
              <p className="text-sm text-muted-foreground">
                Export your expense data as a CSV file
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export to CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About EmoSpend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Version 1.0.0</p>
          <p className="text-sm text-muted-foreground">
            EmoSpend helps you track your expenses and understand your emotional
            spending patterns.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Privacy Policy</Button>
          <Button variant="outline">Terms of Service</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
