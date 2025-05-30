"use client";

import { useState } from "react";
import { SyncManager } from "@/components/sync-manager";
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
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import PrivacyPolicy from "../privacy-policy";
import TermsOfService from "../terms-of-service";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const { user } = useAuth();
  const [isClearing, setIsClearing] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      // Import required functions
      const { getExpensesByDateRange, clearLocalUserData } = await import('@/lib/db');
      const { getIncomesByDateRange, deleteIncome } = await import('@/lib/income');
      
      // Set date range for fetching all data
      const startDate = new Date(0).toISOString(); // Beginning of time
      const endDate = new Date(Date.now() + 1000*60*60*24*365).toISOString(); // One year from now
      
      // Get and delete all expenses
      const allExpenses = await getExpensesByDateRange(startDate, endDate);
      const { deleteExpense } = await import('@/lib/db');
      
      // Delete expenses one by one
      for (const expense of allExpenses) {
        await deleteExpense(expense.id);
      }
      
      // Get and delete all incomes
      const allIncomes = await getIncomesByDateRange(startDate, endDate);
      for (const income of allIncomes) {
        await deleteIncome(income.id);
      }
      
      // Clear any remaining data
      await clearLocalUserData();
      
      // Keep the clearing state active for a moment to show "Clearing..." text on button
      // then redirect to home with cache busting
      setTimeout(() => {
        window.location.href = '/?clear=' + Date.now();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error("Error", {
        description: "Failed to clear data. Please try again."
      });
      setIsClearing(false);
    }
    // Don't set isClearing to false on success as we're redirecting
  };



  return (
    <div className="space-y-6 pb-8 sm:pb-6">
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
          <div className="space-y-6">
            <SyncManager showUI={true} />
            <Separator />
            
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
                  <AlertDialogTitle>⚠️ Warning: Delete All Data</AlertDialogTitle>
                  <div className="space-y-4">
                    <AlertDialogDescription asChild>
                      <div className="font-medium">This action will permanently delete:</div>
                    </AlertDialogDescription>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>All your expense records</li>
                      <li>All your income records</li>
                      <li>Any associated categories and tags</li>
                    </ul>
                    <AlertDialogDescription asChild>
                      <div className="font-medium text-destructive">
                        This action cannot be undone. Your data will be permanently removed from both this device and our servers.
                      </div>
                    </AlertDialogDescription>
                  </div>
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
          <p className="text-sm">Version 1.0.1</p>
          <p className="text-sm text-muted-foreground">
            EmoSpend helps you track your expenses and understand your emotional
            spending patterns.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Privacy Policy</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] max-h-[80vh]">
              <PrivacyPolicy />
            </DialogContent>
          </Dialog>
          
          <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Terms of Service</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] max-h-[80vh]">
              <TermsOfService />
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
