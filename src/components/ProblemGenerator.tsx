'use client';

  import { useState } from 'react';
  import { SingleProblem } from '@/app/page';

  interface ProblemGeneratorProps {
    problem: SingleProblem;
    setIsLoading: (loading: boolean) => void;
  }

  export default function ProblemGenerator({ problem, setIsLoading }: ProblemGeneratorProps) {
    const [numVariations, setNumVariations] = useState(5);

    const handleGenerate = () => {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        alert('문제 생성이 완료되었습니다!');
      }, 1000);
    };

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            생성할 변형 문제 수: {numVariations}개
          </label>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={numVariations}
            onChange={(e) => setNumVariations(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleGenerate}
          className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600"
        >
          {numVariations}개 변형 문제 생성
        </button>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">원본 문제</h3>
          <p>{problem.problemText}</p>
          <h3 className="font-semibold mt-4 mb-2">원본 해설</h3>
          <p>{problem.solutionText}</p>
        </div>
      </div>
    );
  }
