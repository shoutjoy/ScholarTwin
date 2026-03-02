import React, { useState } from 'react';
import { checkAppLockPassword } from '../services/appLockService';

interface AppLockScreenProps {
  onUnlock: () => void;
}

const AppLockScreen: React.FC<AppLockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    if (checkAppLockPassword(password.trim())) {
      onUnlock();
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
            S
          </div>
          <h1 className="text-lg font-bold text-gray-800">ScholarTwin</h1>
          <p className="text-sm text-gray-500 mt-1">비밀번호를 입력하세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            autoFocus
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            확인
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">최초 비밀번호: 0000</p>
      </div>
    </div>
  );
};

export default AppLockScreen;
