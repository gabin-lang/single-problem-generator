'use client';

  import { useState } from 'react';
  import { SingleProblem } from '@/app/page';

  interface ProblemGeneratorProps {
    problem: SingleProblem;
    setIsLoading: (loading: boolean) => void;
  }

  export default function ProblemGenerator({ problem, setIsLoading }: ProblemGeneratorProps) {
    const [generatedProblem, setGeneratedProblem] = useState<string>('');

    const handleGenerate = async () => {
      setIsLoading(true);

      try {
        // 간단한 숫자 치환 로직
        const numbers = problem.problemText.match(/\d+/g) || [];
        let modifiedText = problem.problemText;

        numbers.forEach(num => {
          const originalNum = parseInt(num);
          const newNum = originalNum + Math.floor(Math.random() * 10) + 1;
          modifiedText = modifiedText.replace(num, newNum.toString());
        });

        setGeneratedProblem(modifiedText);
      } catch (error) {
        console.error('Error generating problem:', error);
        setGeneratedProblem('문제 생성 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-4">
        <button
          onClick={handleGenerate}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          문제 생성하기
        </button>

        {generatedProblem && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">생성된 문제:</h3>
            <p>{generatedProblem}</p>
          </div>
        )}
      </div>
    );
  }

  4. "Commit changes" 클릭
    - Commit message: Fix ProblemGenerator.tsx - remove Gemini dependency
