"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import StudyComponent from "@/components/notes/StudyComponent";

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = params.noteId as string;
  const studyMode = searchParams.get('mode') || 'traditional';
  
  // Configuración para modo examen
  const examConfig = studyMode === 'exam' ? {
    questionCount: parseInt(searchParams.get('questions') || '10'),
    timeMinutes: parseInt(searchParams.get('time') || '15')
  } : undefined;

  const handleBack = () => {
    router.back();
  };

  return (
    <StudyComponent
      noteId={noteId}
      studyMode={studyMode as 'traditional' | 'multiple_choice' | 'mixed' | 'exam'}
      examConfig={examConfig}
      onBack={handleBack}
    />
  );
}
