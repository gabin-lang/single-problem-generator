'use client';

  import { useState } from 'react';
  import { SingleProblem } from '@/app/page';

  interface ProblemGeneratorProps {
    problem: SingleProblem;
    setIsLoading: (loading: boolean) => void;
  }

  interface GeneratedProblem {
    sequence: string;
    problemText: string;
    solutionText: string;
    isGenerated: boolean;
  }

  export default function ProblemGenerator({ problem, setIsLoading }: ProblemGeneratorProps) {
    const [numVariations, setNumVariations] = useState(5);
    const [generatedProblems, setGeneratedProblems] = useState<GeneratedProblem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // 간단한 숫자 변형 함수 (기본 기능)
    const transformNumbers = (text: string): string => {
      return text.replace(/\d+/g, (match) => {
        const num = parseInt(match);
        const variation = Math.floor(Math.random() * 3) + 1; // 1-3 범위로 변형
        return (num + variation).toString();
      });
    };

    const generateVariations = async () => {
      setIsGenerating(true);
      setIsLoading(true);

      try {
        const generated: GeneratedProblem[] = [];

        // 원본 문제 추가
        generated.push({
          sequence: '원본',
          problemText: problem.problemText,
          solutionText: problem.solutionText,
          isGenerated: false
        });

        // 변형 문제들 생성
        for (let i = 1; i <= numVariations; i++) {
          generated.push({
            sequence: `변형-${i}`,
            problemText: transformNumbers(problem.problemText),
            solutionText: transformNumbers(problem.solutionText),
            isGenerated: true
          });
        }

        setGeneratedProblems(generated);
      } catch (error) {
        console.error('문제 생성 오류:', error);
        alert('문제 생성 중 오류가 발생했습니다.');
      } finally {
        setIsGenerating(false);
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* 생성 설정 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              생성할 변형 문제 수
            </label>
            <select
              value={numVariations}
              onChange={(e) => setNumVariations(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              <option value={3}>3개</option>
              <option value={5}>5개</option>
              <option value={10}>10개</option>
            </select>
          </div>

          <button
            onClick={generateVariations}
            disabled={isGenerating}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600 
  disabled:bg-gray-400"
          >
            {isGenerating ? '생성 중...' : `${numVariations}개 변형 문제 생성`}
          </button>
        </div>

        {/* 생성된 문제들 표시 */}
        {generatedProblems.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">생성된 문제들</h3>
            {generatedProblems.map((generated, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-700 mb-2">{generated.sequence}</h4>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">문제:</p>
                    <p className="text-gray-800">{generated.problemText}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">해설:</p>
                    <p className="text-gray-800">{generated.solutionText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
