import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

// 제스처(드래그)와 관성(속도) 판정 플러그인을 한 번만 등록한다.
// 제스처를 쓰는 프리미티브(Sheet·ListItem)는 모두 여기서 가져온다.
gsap.registerPlugin(Draggable, InertiaPlugin);

export { gsap, Draggable, InertiaPlugin };
