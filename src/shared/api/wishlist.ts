import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * 위시리스트 저장소 (ADR-0003/0004).
 * 업무: 회원이 담은 영화를 백엔드로 관리한다. 사용자는 세션 쿠키로 식별되므로 userId를 받지 않는다.
 * 목록 조회는 각 페이지가 httpResource로 직접 하고, 여기서는 담기/빼기/포함여부만 명령형으로 제공한다.
 */
@Service()
export class WishlistRepository {
  private readonly http = inject(HttpClient);

  /** 담은 영화 id 목록. */
  ids(): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>('/api/wishlist/ids'));
  }

  /** 특정 영화가 담겨 있는지. */
  async has(movieId: string): Promise<boolean> {
    return (await this.ids()).includes(movieId);
  }

  add(movieId: string): Promise<unknown> {
    return firstValueFrom(this.http.put(`/api/wishlist/${movieId}`, {}));
  }

  remove(movieId: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`/api/wishlist/${movieId}`));
  }
}
