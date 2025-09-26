'use client';

import { useState } from 'react';
import ProblemInput from '@/components/ProblemInput';
import ProblemGenerator from '@/components/ProblemGenerator';

export interface SingleProblem {
  problemText: string;
  problemImage: string | null;
  solutionText: string;
  solutionImage: string | null;
}

export default function Home() {
  const [problem, setProblem] = useState<SingleProblem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProblemSubmit = (problemData: SingleProblem) => {
    setProblem(problemData);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gabin의 단일 문제 변형 생성기
          </h1>
          <p className="text-lg text-gray-600">
            텍스트나 이미지로 입력한 단일 수학 문제의 숫자를 변형한 새로운 문제를 생성합니다
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 문제 입력 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              1. 문제 및 해설 입력
            </h2>
            <ProblemInput onSubmit={handleProblemSubmit} isLoading={isLoading} />
          </div>

          {/* 문제 생성 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              2. 문제 생성 설정
            </h2>
            {problem ? (
              <ProblemGenerator
                problem={problem}
                setIsLoading={setIsLoading}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📝</div>
                <p>먼저 문제와 해설을 입력해주세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
