"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentMeta, DocumentStage } from "@edux/schema";
import { apiClient } from "../../../services/api/apiClient";
import { EduProDashboard } from "../../../components/dashboard/EduProDashboard";
import Link from "next/link";
import { Users } from "lucide-react";
import { useSession } from "../../../hooks/useSession";

export default function TeamPage() {
  const router = useRouter();
  const { user } = useSession();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);

  useEffect(() => {
    apiClient
      .getEduProDocuments()
      .then(setDocuments)
      .catch((err) => console.error("Team board fetch error:", err));
  }, []);

  const handleUpdateStage = (docId: string, stage: DocumentStage) => {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, stage } : d)));
    apiClient.updateDocumentStage(docId, stage);
  };

  if (user && user.planType !== "edu_pro") {
    return (
      <div className="max-w-xl mx-auto p-8 sm:p-12 text-center space-y-5">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-elite-50 dark:bg-elite-950 text-elite-600 flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">The team board is part of Edu Professional</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          It is for tutors, editors and writing centres who work on other people&apos;s papers: a board that moves each document from draft to returned, with scoring for a whole batch at once.
        </p>
        <Link href="/settings?tab=plan" className="inline-block rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-5 py-2.5">
          See the plans
        </Link>
      </div>
    );
  }

  return (
    <EduProDashboard
      documents={documents}
      onOpenDocument={(id) => router.push(`/edit?doc=${id}`)}
      onUpdateStage={handleUpdateStage}
    />
  );
}
