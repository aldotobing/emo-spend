"use client";

import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicy() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">Privacy Policy</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: May 24, 2025
        </p>
      </DialogHeader>
      <ScrollArea className="mt-4 h-[60vh] pr-4">
        <div className="space-y-4 text-sm">
          <h3 className="text-lg font-semibold">1. Introduction</h3>
          <p>
            Welcome to EmoSpend. We prioritize your privacy above all else. This Privacy Policy explains our commitment to protecting your data and privacy when you use our application.
          </p>
          
          <h3 className="text-lg font-semibold">2. Zero Data Collection Policy</h3>
          <p>
            <strong>No Data Collection:</strong> EmoSpend does not collect, store, or transmit any of your personal data to external servers. All your expense data and emotional tags remain private.
          </p>
          <p>
            <strong>No Analytics or Tracking:</strong> We do not implement any analytics, tracking, or monitoring tools that would collect information about your usage patterns or device.
          </p>
          
          <h3 className="text-lg font-semibold">3. AI Analysis</h3>
          <p>
            EmoSpend uses AI technology for analysis of your spending patterns and emotional connections. This analysis is not performed locally on your device, but we maintain a strict no-data-collection policy:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>No personal data is collected or stored by us for AI analysis</li>
            <li>AI processing occurs without collecting or storing your data</li>
            <li>We do not retain any information about your spending patterns</li>
            <li>Your privacy is maintained throughout the entire process</li>
            <li>The AI analysis happens without us collecting your data</li>
          </ul>
          
          <h3 className="text-lg font-semibold">4. Data Security</h3>
          <p>
            We implement appropriate security measures to protect your privacy. Since we don't collect your data on our servers, the risk of data breaches from our end is eliminated.
          </p>
          
          <h3 className="text-lg font-semibold">5. Your Data Control</h3>
          <p>
            You maintain complete control over your data at all times:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You can export your data at any time through the app's settings</li>
            <li>You can delete all your data permanently with the Clear All Data function</li>
            <li>No backups of your data exist on any external servers</li>
            <li>Your data remains private and under your control at all times</li>
          </ul>
          
          <h3 className="text-lg font-semibold">6. Your Rights</h3>
          <p>
            You automatically have all rights to your data. You can access, modify, export, or delete your data at any time through the app's settings without needing to request these actions from us.
          </p>
          
          <h3 className="text-lg font-semibold">7. AI Technology</h3>
          <p>
            The AI analysis features in EmoSpend operate with strict privacy protections, even though the analysis is not performed locally:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>No data is collected or stored for AI analysis</li>
            <li>Pattern recognition and insights are generated without collecting your data</li>
            <li>Your emotional spending patterns remain confidential</li>
            <li>We use advanced privacy-preserving techniques that allow AI analysis without data collection</li>
            <li>The AI can provide insights without us needing to collect or store your information</li>
          </ul>
          
          <h3 className="text-lg font-semibold">8. Changes to This Privacy Policy</h3>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the app and updating the "Last updated" date. Rest assured that our commitment to zero data collection will remain a core principle of any updated policy.
          </p>
          
          <h3 className="text-lg font-semibold">9. Contact Us</h3>
          <p>
            If you have any questions about this Privacy Policy or our privacy practices, please contact us at support@emospend.com.
          </p>
        </div>
      </ScrollArea>
      {/* <DialogFooter className="mt-6">
        <DialogClose asChild>
          <Button>Close</Button>
        </DialogClose>
      </DialogFooter> */}
    </>
  );
}
