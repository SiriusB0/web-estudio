"use client";

import { useEffect, useState } from 'react';

interface MermaidRendererProps {
  chart: string;
  id?: string;
  className?: string;
}

export default function MermaidRenderer({ chart, id, className = "" }: MermaidRendererProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    console.log('🔍 MermaidRenderer: useEffect triggered', { chart: chart?.substring(0, 50), id });
    
    if (!chart.trim()) {
      setError('Código de diagrama vacío');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const renderDiagram = async () => {
      try {
        console.log('🚀 MermaidRenderer: Iniciando renderizado...');
        setIsLoading(true);
        setError(null);
        setDebugInfo('Importando Mermaid...');

        // Importar mermaid dinámicamente
        const mermaidModule = await import('mermaid');
        console.log('📦 MermaidRenderer: Mermaid importado', mermaidModule);
        
        if (!isMounted) return;
        
        const mermaid = mermaidModule.default;
        setDebugInfo('Configurando Mermaid...');

        // Configuración básica con ajustes para evitar corte de texto
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          mindmap: {
            padding: 20,
            maxNodeWidth: 300
          },
          flowchart: {
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50,
            useMaxWidth: false,
            htmlLabels: true
          },
          themeVariables: {
            fontSize: '14px',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif'
          }
        });

        console.log('⚙️ MermaidRenderer: Mermaid configurado');
        setDebugInfo('Generando diagrama...');

        // Generar ID único
        const diagramId = id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('🆔 MermaidRenderer: ID generado', diagramId);

        // Renderizar el diagrama
        console.log('🎨 MermaidRenderer: Llamando a mermaid.render...');
        const result = await mermaid.render(diagramId, chart.trim());
        console.log('✅ MermaidRenderer: Render completado', result);
        
        if (!isMounted) {
          console.log('❌ MermaidRenderer: Componente desmontado después del render');
          return;
        }

        // Procesar el SVG para evitar corte de texto
        let processedSvg = result.svg;
        
        // Aplicar estilos CSS para evitar truncamiento de texto
        processedSvg = processedSvg.replace(
          /<svg([^>]*)>/,
          '<svg$1 style="max-width: 100%; height: auto; overflow: visible;">'
        );
        
        // Agregar estilos a elementos de texto para evitar cortes
        processedSvg = processedSvg.replace(
          /<text([^>]*?)>/g,
          '<text$1 style="text-overflow: visible; white-space: nowrap; overflow: visible;">'
        );
        
        // Asegurar que los elementos foreignObject también muestren texto completo
        processedSvg = processedSvg.replace(
          /<foreignObject([^>]*?)>/g,
          '<foreignObject$1 style="overflow: visible;">'
        );
        
        setSvgContent(processedSvg);
        setIsLoading(false);
        setDebugInfo('¡Completado!');
        console.log('🎉 MermaidRenderer: Renderizado exitoso');

      } catch (err) {
        console.error('💥 MermaidRenderer: Error completo:', err);
        if (!isMounted) return;
        
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error: ${errorMsg}`);
        setDebugInfo(`Error: ${errorMsg}`);
        setIsLoading(false);
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
      console.log('🧹 MermaidRenderer: Cleanup ejecutado');
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className={`mermaid-error bg-red-900/20 border border-red-700/50 rounded-lg p-4 my-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Error en diagrama Mermaid</span>
        </div>
        <p className="text-red-300 text-sm">{error}</p>
        <details className="mt-2">
          <summary className="text-red-400 text-xs cursor-pointer hover:text-red-300">
            Ver código del diagrama
          </summary>
          <pre className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300 overflow-x-auto">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`mermaid-loading bg-gray-800/50 border border-gray-700/50 rounded-lg p-8 my-4 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <div className="text-center">
            <span className="text-gray-400 block">Renderizando diagrama...</span>
            {debugInfo && <span className="text-gray-500 text-xs block mt-1">{debugInfo}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mermaid-container bg-gray-900/30 border border-gray-700/30 rounded-lg p-4 my-4 overflow-visible ${className}`}>
      <div 
        className="mermaid-diagram flex justify-center items-center min-h-[100px] overflow-visible"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{ 
          maxWidth: '100%',
          overflow: 'visible',
          whiteSpace: 'nowrap'
        }}
      />
    </div>
  );
}

// Hook personalizado para detectar código Mermaid
export function useMermaidDetection(content: string) {
  const mermaidBlocks = content.match(/```mermaid\n([\s\S]*?)\n```/g) || [];
  
  return mermaidBlocks.map((block, index) => {
    const code = block.replace(/```mermaid\n/, '').replace(/\n```$/, '');
    return {
      id: `mermaid-block-${index}`,
      code: code.trim(),
      fullMatch: block
    };
  });
}
