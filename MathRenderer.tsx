'use client';

import { useEffect, useRef, useState } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: () => Promise<void>;
      startup?: {
        document?: unknown;
      };
    };
  }
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const renderMath = async () => {
      if (typeof window !== 'undefined' && window.MathJax && containerRef.current) {
        try {
          console.log('Starting MathJax rendering for:', content.substring(0, 50) + '...');

          // 기존 렌더링 정리
          if (window.MathJax.startup?.document) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window.MathJax.startup.document as any).state(0);
          }

          // 특정 요소만 렌더링하도록 지정
          if (window.MathJax.typesetPromise) {
            await window.MathJax.typesetPromise();
            console.log('MathJax rendering completed successfully');
          }
        } catch (error) {
          console.error('MathJax rendering error:', error);
          // 에러 발생시 전체 페이지 렌더링 시도
          try {
            console.log('Trying fallback MathJax rendering...');
            if (window.MathJax.typesetPromise) {
              await window.MathJax.typesetPromise();
              console.log('Fallback MathJax rendering completed');
            }
          } catch (fallbackError) {
            console.error('MathJax fallback rendering error:', fallbackError);
          }
        }
      } else {
        console.warn('MathJax not available:', {
          window: typeof window !== 'undefined',
          MathJax: !!window?.MathJax,
          container: !!containerRef.current
        });
      }
    };

    // MathJax가 아직 로드되지 않은 경우 기다림
    const checkMathJax = (attempts = 0) => {
      if (typeof window !== 'undefined' && window.MathJax && window.MathJax.typesetPromise) {
        console.log('MathJax is ready, starting render');
        renderMath();
      } else if (attempts < 50) { // 최대 5초 대기
        console.log(`Waiting for MathJax... attempt ${attempts + 1}`);
        setTimeout(() => checkMathJax(attempts + 1), 100);
      } else {
        console.error('MathJax failed to load after 5 seconds');
      }
    };

    // 컨텐츠가 변경될 때마다 렌더링
    if (content) {
      // 강제 리렌더링을 위한 key 업데이트
      setKey(prev => prev + 1);
      const timer = setTimeout(() => checkMathJax(), 100);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [content]);

  return (
    <div
      key={key}
      ref={containerRef}
      className={`math-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}