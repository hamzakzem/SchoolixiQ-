import React from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { printElement } from "./printUtils";

interface PrintOptions {
  contentRef: React.RefObject<HTMLElement>;
  documentTitle?: string;
  onBeforePrint?: () => void | Promise<void>;
  onAfterPrint?: () => void | Promise<void>;
}

export const printService = {
  /**
   * Primary robust HTML print method replacing react-to-print
   */
  print: async ({ contentRef, documentTitle = 'Document', onBeforePrint, onAfterPrint }: PrintOptions) => {
    if (!contentRef.current) {
      console.error("Nothing to print: contentRef is null");
      return false;
    }

    try {
      if (onBeforePrint) await onBeforePrint();

      // Use the printElement utility which opens a new window for isolated printing
      const success = printElement(contentRef.current, documentTitle);
      
      if (!success) {
         console.warn("Print popup may have been blocked");
      }

      if (onAfterPrint) await onAfterPrint();
      
      return true;
    } catch (error) {
      console.error('Print failed:', error);
      return false;
    }
  },

  /**
   * Universal print tracker using Firebase
   */
  logPrintAction: async (
    schoolId: string,
    userId: string,
    templateName: string,
    count: number = 1,
  ) => {
    try {
      await addDoc(collection(db, "print_logs"), {
        schoolId,
        userId,
        templateName,
        count,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to log print action. Continuing.", error);
    }
  },

  /**
   * Update printed status in Firestore document to tie printing to data
   */
  incrementPrintCount: async (collectionName: string, docId: string) => {
    try {
      await updateDoc(doc(db, collectionName, docId), {
        printCount: increment(1),
        lastPrintedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update printed count.", error);
    }
  },
};
