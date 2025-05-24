"use client";

import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsOfService() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">Terms of Service</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: May 24, 2025
        </p>
      </DialogHeader>
      <ScrollArea className="mt-4 h-[60vh] pr-4">
        <div className="space-y-4 text-sm">
          <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
          <p>
            By accessing or using EmoSpend, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our application.
          </p>
          
          <h3 className="text-lg font-semibold">2. Description of Service</h3>
          <p>
            EmoSpend is a privacy-focused expense tracking application that allows users to record expenses and associate them with emotional states to better understand spending patterns. We maintain a strict no-data-collection policy, even though our AI analysis is not performed locally on your device.
          </p>
          
          <h3 className="text-lg font-semibold">3. Privacy Protection</h3>
          <p>
            EmoSpend is designed with privacy as a core principle. We do not collect your data, even for AI analysis that occurs outside your device. Our technology allows for AI insights without requiring data collection. You are responsible for maintaining the security of your device to protect your expense data.
          </p>
          
          <h3 className="text-lg font-semibold">4. User Content</h3>
          <p>
            You retain complete ownership of any content you input into the application. We do not collect or store any of your data on our servers, there is no need for you to grant us any license to your content. Your data belongs exclusively to you.
          </p>
          
          <h3 className="text-lg font-semibold">5. Acceptable Use</h3>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the application for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any part of the application</li>
            <li>Interfere with the proper functioning of the application</li>
            <li>Use automated means to access or collect data from the application</li>
          </ul>
          
          <h3 className="text-lg font-semibold">6. Intellectual Property</h3>
          <p>
            The application, including its design, features, and content (excluding user content), is owned by EmoSpend and is protected by copyright, trademark, and other intellectual property laws.
          </p>
          
          <h3 className="text-lg font-semibold">7. Privacy Commitment</h3>
          <p>
            We are committed to maintaining a zero data collection policy. While our AI analysis is not performed locally on your device, we do not collect, store, or process any of your data. Our technology allows for AI-powered insights without requiring the collection or storage of your personal information.
          </p>
          
          <h3 className="text-lg font-semibold">8. Disclaimer of Warranties</h3>
          <p>
            The application is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the application will be error-free or uninterrupted. However, your data privacy is maintained as we do not collect your data.
          </p>
          
          <h3 className="text-lg font-semibold">9. Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, EmoSpend shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the application. Since we do not collect or store your data, our liability related to data breaches is inherently limited.
          </p>
          
          <h3 className="text-lg font-semibold">10. Changes to Terms</h3>
          <p>
            We may modify these Terms of Service at any time. Continued use of the application after any such changes constitutes your acceptance of the new terms. Any changes to our Terms will maintain our commitment to zero data collection.
          </p>
          
          <h3 className="text-lg font-semibold">11. Application Usage</h3>
          <p>
            We reserve the right to issue application updates that may affect functionality for users who violate these Terms of Service.
          </p>
          
          <h3 className="text-lg font-semibold">12. Data Ownership</h3>
          <p>
            All data you enter into EmoSpend remains exclusively yours. We have no access to your data, cannot view it, and cannot delete it. You maintain complete control over your data at all times through the application's interface.
          </p>
          
          <h3 className="text-lg font-semibold">13. Governing Law</h3>
          <p>
            These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction in which EmoSpend operates, without regard to its conflict of law provisions.
          </p>
          
          <h3 className="text-lg font-semibold">14. Contact Information</h3>
          <p>
            If you have any questions about these Terms of Service or our privacy practices, please contact us at support@emospend.com.
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
