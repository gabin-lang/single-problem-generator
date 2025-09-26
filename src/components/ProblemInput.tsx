'use client';

  import { useState } from 'react';
  import { SingleProblem } from '@/app/page';

  interface ProblemInputProps {
    onSubmit: (problem: SingleProblem) => void;
    isLoading: boolean;
  }

  export default function ProblemInput({ onSubmit, isLoading }: ProblemInputProps) {
    const [problemText, setProblemText] = useState('');
    const [solutionText, setSolutionText] = useState('');
    const [inputMode, setInputMode] = useState<'text' | 'image'>('text');

    const handleSubmit = () => {
      if (!problemText.trim() || !solutionText.trim()) {
        alert('문제와 해설을 모두 입력해주세요.');
        return;
      }

      const problemData: SingleProblem = {
        problemText: problemText.trim(),
        problemImage: null,
        solutionText: solutionText.trim(),
        solutionImage: null,
      };

      onSubmit(problemData);
    };

    return (
      <div className="space-y-6">
        {/* 입력 모드 선택 */}
        <div className="flex space-x-4">
          <button
            onClick={() => setInputMode('text')}
            className={`px-4 py-2 rounded-lg font-medium ${
              inputMode === 'text'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            텍스트 입력
          </button>
          <button
            onClick={() => setInputMode('image')}
            className={`px-4 py-2 rounded-lg font-medium ${
              inputMode === 'image'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            이미지 입력
          </button>
        </div>

        {inputMode === 'text' && (
          <div className="space-y-4">
            {/* 문제 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                문제
              </label>
              <textarea
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500
  focus:border-transparent"
                rows={4}
                placeholder="수학 문제를 입력하세요..."
              />
            </div>

            {/* 해설 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                해설
              </label>
              <textarea
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500
  focus:border-transparent"
                rows={4}
                placeholder="해설을 입력하세요..."
              />
            </div>
          </div>
        )}

        {inputMode === 'image' && (
          <div className="text-center py-8 text-gray-500">
            <p>이미지 입력 기능은 곧 추가될 예정입니다.</p>
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !problemText.trim() || !solutionText.trim()}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 
  disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '처리 중...' : '문제 입력 완료'}
        </button>
      </div>
    );
  }
