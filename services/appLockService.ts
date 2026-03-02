/**
 * 앱 실행 시 잠금 화면용 비밀번호 저장/조회
 * 기본 비밀번호: 0000
 */

const STORAGE_KEY = 'scholartwin_app_lock_pw';
const DEFAULT_PASSWORD = '0000';

export function getAppLockPassword(): string {
  if (typeof window === 'undefined') return DEFAULT_PASSWORD;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ?? DEFAULT_PASSWORD;
}

export function setAppLockPassword(newPassword: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, newPassword);
}

export function checkAppLockPassword(input: string): boolean {
  return getAppLockPassword() === input;
}
