"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import StudyComponent from "@/components/notes/StudyComponent";

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = params.noteId as string;
  const studyMode = searchParams.get('mode') || 'traditional';
  
  console.log('🎯 StudyPage - Renderizando con noteId:', noteId);
  console.log('🎯 StudyPage - studyMode:', studyMode);
  console.log('🎯 StudyPage - params completos:', params);
  console.log('🎯 StudyPage - searchParams completos:', Object.fromEntries(searchParams.entries()));
  
  // Configuración para modo examen
  const examConfig = studyMode === 'exam' ? {
    questionCount: parseInt(searchParams.get('questions') || '10'),
    timeMinutes: parseInt(searchParams.get('time') || '15')
  } : undefined;

  const handleBack = () => {
    router.back();
  };

  if (!noteId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="text-red-400">Error: No se proporcionó noteId</div>
      </div>
    );
  }

  return (
    <StudyComponent
      noteId={noteId}
      studyMode={studyMode as 'traditional' | 'multiple_choice' | 'mixed' | 'exam'}
      examConfig={examConfig}
      onBack={handleBack}
    />
  );
}
