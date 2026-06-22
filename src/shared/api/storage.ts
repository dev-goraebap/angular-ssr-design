/**
 * 영속 저장소를 요청한다.
 * 업무: 기본 IndexedDB는 저장 공간 압박 시 브라우저가 비울 수 있다. persist를 받아 두면
 * 사용자가 직접 지우기 전까지 데이터가 유지된다. 권한이 없거나 거부돼도 앱은 정상 동작한다.
 *
 * @returns 영속 저장이 보장되면 true.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  // SSR 가드: 서버에는 navigator가 없다. 브라우저 전용 API이므로 서버에서는 조용히 무시한다.
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
